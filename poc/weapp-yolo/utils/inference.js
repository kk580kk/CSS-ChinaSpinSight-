// utils/inference.js

// ONNX Runtime Web 加载
let ort = null;

class InferenceEngine {
  constructor() {
    this.session = null;
    this.inputName = null;
    this.outputName = null;
    this.inputShape = [1, 3, 320, 320]; // 量化模型使用 320x320
    this.confThreshold = 0.5;
    this.nmsThreshold = 0.45;
  }

  /**
   * 初始化 ONNX Runtime
   */
  async initialize() {
    try {
      // 动态加载 ONNX Runtime
      if (!ort) {
        // 微信小程序需要使用 wasm 版本
        const ortModule = await import('./ort-wasm.min.js');
        ort = ortModule;
      }
      
      console.log('ONNX Runtime loaded');
      return true;
    } catch (err) {
      console.error('Failed to load ONNX Runtime:', err);
      throw new Error('ONNX Runtime initialization failed');
    }
  }

  /**
   * 加载模型
   */
  async loadModel(modelPath) {
    try {
      if (!ort) {
        await this.initialize();
      }

      console.log('Loading model from:', modelPath);
      
      // 创建推理会话
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      // 获取输入输出名称
      this.inputName = this.session.inputNames[0];
      this.outputName = this.session.outputNames[0];

      console.log('Model loaded successfully');
      console.log('Input:', this.inputName, 'Output:', this.outputName);
      
      return true;
    } catch (err) {
      console.error('Failed to load model:', err);
      throw err;
    }
  }

  /**
   * 预处理图像
   */
  preprocess(imageData, width, height) {
    // 创建输入张量 (320x320)
    const inputSize = 320;
    const tensor = new Float32Array(1 * 3 * inputSize * inputSize);
    
    // 计算缩放比例
    const scale = Math.min(inputSize / width, inputSize / height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    
    // 计算填充
    const padX = Math.floor((inputSize - newWidth) / 2);
    const padY = Math.floor((inputSize - newHeight) / 2);
    
    // 归一化和填充
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < inputSize; h++) {
        for (let w = 0; w < inputSize; w++) {
          const idx = c * inputSize * inputSize + h * inputSize + w;
          
          // 计算原图位置
          const srcX = Math.round((w - padX) / scale);
          const srcY = Math.round((h - padY) / scale);
          
          if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
            const srcIdx = (srcY * width + srcX) * 4 + c;
            // 归一化到 0-1
            tensor[idx] = imageData[srcIdx] / 255.0;
          } else {
            // 填充区域
            tensor[idx] = 0.5; // 灰色填充
          }
        }
      }
    }
    
    return {
      tensor,
      scale,
      padX,
      padY,
    };
  }

  /**
   * 执行推理
   */
  async infer(imageData, width, height) {
    if (!this.session) {
      throw new Error('Model not loaded');
    }

    const startTime = Date.now();
    
    // 预处理
    const { tensor, scale, padX, padY } = this.preprocess(imageData, width, height);
    
    // 创建输入张量
    const inputTensor = new ort.Tensor('float32', tensor, this.inputShape);
    
    // 执行推理
    const feeds = {};
    feeds[this.inputName] = inputTensor;
    
    const results = await this.session.run(feeds);
    const output = results[this.outputName];
    
    // 后处理
    const detections = this.postprocess(output.data, scale, padX, padY, width, height);
    
    const inferenceTime = Date.now() - startTime;
    
    return {
      detections,
      inferenceTime,
    };
  }

  /**
   * 后处理 - NMS
   */
  postprocess(output, scale, padX, padY, origWidth, origHeight) {
    const detections = [];
    const numAnchors = output.length / 85; // 80 classes + 5 box params
    
    // 解析输出
    for (let i = 0; i < numAnchors; i++) {
      const offset = i * 85;
      const x = output[offset];
      const y = output[offset + 1];
      const w = output[offset + 2];
      const h = output[offset + 3];
      const conf = output[offset + 4];
      
      if (conf < this.confThreshold) continue;
      
      // 找到最大类别概率
      let maxClassProb = 0;
      let classId = 0;
      for (let c = 0; c < 80; c++) {
        const prob = output[offset + 5 + c];
        if (prob > maxClassProb) {
          maxClassProb = prob;
          classId = c;
        }
      }
      
      const score = conf * maxClassProb;
      if (score < this.confThreshold) continue;
      
      // 转换到原图坐标
      const x1 = (x - w / 2 - padX) / scale;
      const y1 = (y - h / 2 - padY) / scale;
      const x2 = (x + w / 2 - padX) / scale;
      const y2 = (y + h / 2 - padY) / scale;
      
      detections.push({
        x1: Math.max(0, x1),
        y1: Math.max(0, y1),
        x2: Math.min(origWidth, x2),
        y2: Math.min(origHeight, y2),
        score,
        classId,
      });
    }
    
    // NMS
    return this.nms(detections);
  }

  /**
   * 非极大值抑制
   */
  nms(detections) {
    if (detections.length === 0) return [];
    
    // 按分数排序
    detections.sort((a, b) => b.score - a.score);
    
    const result = [];
    const suppressed = new Set();
    
    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;
      
      result.push(detections[i]);
      
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;
        
        const iou = this.calculateIoU(detections[i], detections[j]);
        if (iou > this.nmsThreshold) {
          suppressed.add(j);
        }
      }
    }
    
    return result;
  }

  /**
   * 计算 IoU
   */
  calculateIoU(box1, box2) {
    const x1 = Math.max(box1.x1, box2.x1);
    const y1 = Math.max(box1.y1, box2.y1);
    const x2 = Math.min(box1.x2, box2.x2);
    const y2 = Math.min(box1.y2, box2.y2);
    
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
    const area2 = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);
    const union = area1 + area2 - intersection;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 释放资源
   */
  dispose() {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
  }
}

module.exports = new InferenceEngine();
