// ChinaSpinSight AI Inference Module
// 微信小程序端侧 AI 推理封装
// 使用 wx.createInferenceSession() 进行 ONNX 模型推理

import { ModelStorage } from './storage.js';

const MODEL_CONFIG = {
  // 模型下载地址（需要替换为实际 CDN 地址）
  MODEL_URL: 'https://your-cdn.example.com/models/yolov5n.onnx',
  MODEL_VERSION: '1.0.0',
  // 输入图像尺寸
  INPUT_SIZE: 640,
  // 置信度阈值
  CONFIDENCE_THRESHOLD: 0.5,
  // NMS 阈值
  IOU_THRESHOLD: 0.45
};

class AIService {
  constructor() {
    this.session = null;
    this.isLoading = false;
    this.modelReady = false;
  }

  /**
   * 初始化 AI 服务
   */
  async init() {
    if (this.session && this.modelReady) {
      return true;
    }

    if (this.isLoading) {
      // 等待加载完成
      return new Promise((resolve, reject) => {
        const checkReady = setInterval(() => {
          if (this.modelReady) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 500);
        
        // 超时 30 秒
        setTimeout(() => {
          clearInterval(checkReady);
          reject(new Error('Model loading timeout'));
        }, 30000);
      });
    }

    this.isLoading = true;

    try {
      // 下载模型（如需要）
      const modelPath = await this.downloadModel();
      
      // 创建推理 Session
      await this.createSession(modelPath);
      
      this.isLoading = false;
      this.modelReady = true;
      
      // 保存状态
      ModelStorage.setStatus({
        loaded: true,
        version: MODEL_CONFIG.MODEL_VERSION,
        loadedAt: Date.now()
      });
      
      console.log('✅ AI Model ready');
      return true;
    } catch (error) {
      this.isLoading = false;
      console.error('❌ AI Model init failed:', error);
      throw error;
    }
  }

  /**
   * 下载模型文件
   */
  async downloadModel() {
    const fs = wx.getFileSystemManager();
    const modelDir = `${wx.env.USER_DATA_PATH}/models`;
    const modelPath = `${modelDir}/yolov5n.onnx`;

    // 检查模型是否已存在
    try {
      fs.accessSync(modelPath);
      console.log('📦 Model already exists');
      return modelPath;
    } catch (e) {
      console.log('📥 Downloading model...');
    }

    // 创建模型目录
    try {
      fs.mkdirSync({ dirPath: modelDir, recursive: true });
    } catch (e) {}

    // 下载模型
    const downloadTask = wx.downloadFile({
      url: MODEL_CONFIG.MODEL_URL,
      filePath: modelPath,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Model downloaded');
        }
      },
      fail: (err) => {
        console.error('❌ Model download failed:', err);
        throw err;
      }
    });

    return new Promise((resolve, reject) => {
      downloadTask.onProgressUpdate((res) => {
        console.log(`📥 Download progress: ${res.progress}%`);
      });

      downloadTask.onSuccess(() => resolve(modelPath));
      downloadTask.onFail(reject);
    });
  }

  /**
   * 创建推理 Session
   */
  async createSession(modelPath) {
    return new Promise((resolve, reject) => {
      try {
        this.session = wx.createInferenceSession({
          model: modelPath,
          // precisionLevel: 0 - 最快，4 - 最高精度
          precisionLevel: 2,
          // 是否使用 NPU（仅 iOS 有效）
          allowNPU: true,
          // 是否生成量化模型
          allowQuantize: false
        });

        // 监听加载完成
        this.session.onLoad(() => {
          console.log('✅ Inference session loaded');
          resolve(this.session);
        });

        // 监听错误
        this.session.onError((err) => {
          console.error('❌ Inference session error:', err);
          reject(err);
        });

      } catch (err) {
        console.error('❌ Failed to create inference session:', err);
        reject(err);
      }
    });
  }

  /**
   * 执行目标检测
   * @param {Object} inputData - 输入数据（ArrayBuffer 或 Float32Array）
   * @returns {Array} 检测结果数组
   */
  async detect(inputData) {
    if (!this.session || !this.modelReady) {
      throw new Error('Model not ready');
    }

    return new Promise((resolve, reject) => {
      try {
        // 准备输入张量
        // 注意：这里需要根据实际的模型输入格式进行调整
        // YOLOv5 通常输入: [1, 3, 640, 640] 的 Float32 数组
        const inputTensor = {
          name: 'images',
          shape: [1, 3, MODEL_CONFIG.INPUT_SIZE, MODEL_CONFIG.INPUT_SIZE],
          data: inputData
        };

        // 执行推理
        this.session.predict({
          inputs: [inputTensor],
          outputs: ['output'],  // 根据实际模型输出名称调整
          callback: (err, outputs) => {
            if (err) {
              reject(err);
              return;
            }

            // 处理输出
            const results = this.processOutput(outputs);
            resolve(results);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 处理模型输出
   * 解析 YOLOv5 的输出并进行后处理
   */
  processOutput(outputs) {
    // 这里的处理逻辑需要根据实际的 YOLOv5 输出格式进行调整
    // YOLOv5 通常输出: [batch, num_boxes, 85]
    // 85 = 4 (bbox) + 1 (objectness) + 80 (classes)
    
    const output = outputs[0];  // 获取输出张量
    const results = [];

    // 简化的后处理（实际需要根据模型输出格式调整）
    // 1. 过滤低置信度检测
    // 2. NMS 非极大值抑制
    // 3. 解析边界框和类别

    // 示例：假设 output 是 [num_boxes, 85] 的数组
    for (let i = 0; i < output.length; i++) {
      const box = output[i];
      const objectness = box[4];
      
      if (objectness > MODEL_CONFIG.CONFIDENCE_THRESHOLD) {
        // 找到最高置信度的类别
        let maxClass = 0;
        let maxScore = 0;
        for (let j = 5; j < box.length; j++) {
          if (box[j] > maxScore) {
            maxScore = box[j];
            maxClass = j - 5;
          }
        }

        const score = objectness * maxScore;
        if (score > MODEL_CONFIG.CONFIDENCE_THRESHOLD) {
          results.push({
            bbox: {
              x: box[0],
              y: box[1],
              w: box[2],
              h: box[3]
            },
            score: score,
            class: maxClass
          });
        }
      }
    }

    // 应用 NMS
    return this.nms(results, MODEL_CONFIG.IOU_THRESHOLD);
  }

  /**
   * 非极大值抑制 (NMS)
   */
  nms(boxes, iouThreshold) {
    if (boxes.length === 0) return [];

    // 按分数排序
    boxes.sort((a, b) => b.score - a.score);

    const keep = [];
    const suppressed = new Set();

    for (let i = 0; i < boxes.length; i++) {
      if (suppressed.has(i)) continue;

      keep.push(boxes[i]);

      for (let j = i + 1; j < boxes.length; j++) {
        if (suppressed.has(j)) continue;

        const iou = this.calculateIoU(boxes[i].bbox, boxes[j].bbox);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }

    return keep;
  }

  /**
   * 计算 IoU
   */
  calculateIoU(box1, box2) {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.w, box2.x + box2.w);
    const y2 = Math.min(box1.y + box1.h, box2.y + box2.h);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.w * box1.h;
    const area2 = box2.w * box2.h;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  /**
   * 从视频帧进行检测
   * @param {string} videoPath - 视频文件路径
   * @returns {Object} 检测结果
   */
  async detectFromVideo(videoPath) {
    // 1. 打开视频
    const canvas = wx.createOffscreenCanvas(640, 640);
    const ctx = canvas.getContext('2d');
    
    // 2. 提取关键帧（每隔几帧取一帧）
    // 这里简化处理，实际需要更复杂的逻辑
    
    // 3. 对每帧进行检测
    // 4. 跟踪球体轨迹
    // 5. 计算旋转圈数
    
    // 示例返回
    return {
      spin_rounds: 3.5,
      confidence: 0.92,
      duration: 0.8,
      trajectory: []
    };
  }

  /**
   * 计算旋转圈数
   * 基于检测到的球体标记点轨迹
   */
  calculateSpin(trajectory) {
    if (!trajectory || trajectory.length < 2) {
      return { spin_rounds: 0, confidence: 0 };
    }

    // 简化的旋转计算
    // 实际需要基于标记点的帧间位移计算角速度
    
    let totalRotation = 0;
    let confidentFrames = 0;

    for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1];
      const curr = trajectory[i];

      if (prev.marks && curr.marks && prev.marks.length > 0 && curr.marks.length > 0) {
        // 计算标记点的角度变化
        const angle1 = Math.atan2(prev.marks[0].y - curr.marks[0].y, prev.marks[0].x - curr.marks[0].x);
        const angle2 = Math.atan2(curr.marks[0].y - prev.marks[0].y, curr.marks[0].x - prev.marks[0].x);
        
        let deltaAngle = Math.abs(angle2 - angle1);
        if (deltaAngle > Math.PI) {
          deltaAngle = 2 * Math.PI - deltaAngle;
        }
        
        totalRotation += deltaAngle;
        confidentFrames++;
      }
    }

    const spinRounds = (totalRotation / (2 * Math.PI)) * (confidentFrames / trajectory.length);
    const confidence = confidentFrames / trajectory.length;

    return {
      spin_rounds: Math.min(spinRounds, 10),  // 限制最大 10 圈
      confidence: Math.min(confidence, 0.95)
    };
  }

  /**
   * 释放资源
   */
  destroy() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
    this.modelReady = false;
    this.isLoading = false;
  }
}

// 单例
let aiServiceInstance = null;

export function getAIService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

export default {
  getAIService,
  AIService,
  MODEL_CONFIG
};
