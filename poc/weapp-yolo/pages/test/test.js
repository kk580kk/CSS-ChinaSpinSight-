// pages/test/test.js
// 测试页面 - 用于验证模型加载和推理

const modelManager = require('../../utils/modelManager');

Page({
  data: {
    testResults: [],
    running: false,
    currentTest: '',
  },

  onLoad() {
    this.addResult('测试页面加载完成', 'info');
  },

  /**
   * 添加测试结果
   */
  addResult(message, type = 'info') {
    const results = this.data.testResults;
    results.push({
      time: new Date().toLocaleTimeString(),
      message,
      type,
    });
    this.setData({ testResults: results });
  },

  /**
   * 测试 1: 检查模型
   */
  async onTestCheckModel() {
    this.setData({ currentTest: '检查模型', running: true });
    this.addResult('开始检查模型...', 'info');

    try {
      const result = await modelManager.checkModel();
      this.addResult(`模型存在: ${result.exists}`, result.exists ? 'success' : 'warning');
      this.addResult(`模型路径: ${result.path || 'N/A'}`, 'info');
      
      if (result.exists) {
        const info = modelManager.getModelInfo();
        this.addResult(`模型大小: ${(info.size / 1024 / 1024).toFixed(2)} MB`, 'info');
        this.addResult(`模型版本: ${info.version}`, 'info');
      }
    } catch (err) {
      this.addResult(`检查失败: ${err.message}`, 'error');
    }

    this.setData({ running: false });
  },

  /**
   * 测试 2: 下载模型
   */
  async onTestDownloadModel() {
    this.setData({ currentTest: '下载模型', running: true });
    this.addResult('开始下载模型...', 'info');

    try {
      const startTime = Date.now();
      
      const result = await modelManager.downloadModel((progress, written, total) => {
        this.addResult(`下载进度: ${progress}% (${(written/1024/1024).toFixed(2)}MB / ${(total/1024/1024).toFixed(2)}MB)`, 'info');
      });

      const duration = Date.now() - startTime;
      this.addResult(`下载完成: ${result.success}`, 'success');
      this.addResult(`下载耗时: ${(duration/1000).toFixed(2)} 秒`, 'info');
      this.addResult(`模型路径: ${result.path}`, 'info');
    } catch (err) {
      this.addResult(`下载失败: ${err.message}`, 'error');
    }

    this.setData({ running: false });
  },

  /**
   * 测试 3: 加载 ONNX Runtime
   */
  async onTestLoadOrt() {
    this.setData({ currentTest: '加载 ONNX Runtime', running: true });
    this.addResult('开始加载 ONNX Runtime...', 'info');

    try {
      const ortLoader = require('../../inference/ort-loader');
      const startTime = Date.now();
      
      const ort = await ortLoader.load();
      const duration = Date.now() - startTime;
      
      this.addResult('ONNX Runtime 加载成功', 'success');
      this.addResult(`加载耗时: ${(duration/1000).toFixed(2)} 秒`, 'info');
      
      // 检查版本
      if (ort && ort.version) {
        this.addResult(`ONNX Runtime 版本: ${ort.version}`, 'info');
      }
    } catch (err) {
      this.addResult(`加载失败: ${err.message}`, 'error');
    }

    this.setData({ running: false });
  },

  /**
   * 测试 4: 加载模型
   */
  async onTestLoadModel() {
    this.setData({ currentTest: '加载模型', running: true });
    this.addResult('开始加载模型...', 'info');

    try {
      const inference = require('../../utils/inference');
      const modelPath = modelManager.getModelPath();
      
      this.addResult(`模型路径: ${modelPath}`, 'info');
      
      const startTime = Date.now();
      await inference.initialize();
      await inference.loadModel(modelPath);
      const duration = Date.now() - startTime;
      
      this.addResult('模型加载成功', 'success');
      this.addResult(`加载耗时: ${(duration/1000).toFixed(2)} 秒`, 'info');
      
      // 保存到全局
      const app = getApp();
      app.globalData.modelLoaded = true;
      app.globalData.inferenceSession = inference;
      
    } catch (err) {
      this.addResult(`加载失败: ${err.message}`, 'error');
    }

    this.setData({ running: false });
  },

  /**
   * 测试 5: 单帧推理
   */
  async onTestSingleInference() {
    this.setData({ currentTest: '单帧推理', running: true });
    this.addResult('开始单帧推理测试...', 'info');

    try {
      const inference = require('../../utils/inference');
      
      // 创建测试图像数据 (模拟 320x320 图像)
      const width = 320;
      const height = 320;
      const imageData = new Uint8Array(width * height * 4);
      
      // 填充随机数据
      for (let i = 0; i < imageData.length; i++) {
        imageData[i] = Math.floor(Math.random() * 256);
      }
      
      this.addResult(`测试图像: ${width}x${height}`, 'info');
      
      const startTime = Date.now();
      const result = await inference.infer(imageData, width, height);
      const duration = Date.now() - startTime;
      
      this.addResult('推理完成', 'success');
      this.addResult(`推理耗时: ${result.inferenceTime} ms`, 'info');
      this.addResult(`检测到目标: ${result.detections.length} 个`, 'info');
      
      if (result.detections.length > 0) {
        result.detections.forEach((det, i) => {
          this.addResult(`目标 ${i+1}: 置信度 ${(det.score * 100).toFixed(1)}%`, 'info');
        });
      }
      
    } catch (err) {
      this.addResult(`推理失败: ${err.message}`, 'error');
    }

    this.setData({ running: false });
  },

  /**
   * 运行全部测试
   */
  async onRunAllTests() {
    this.setData({ testResults: [] });
    
    await this.onTestCheckModel();
    await this.onTestDownloadModel();
    await this.onTestLoadOrt();
    await this.onTestLoadModel();
    await this.onTestSingleInference();
    
    this.addResult('全部测试完成', 'success');
  },

  /**
   * 清除缓存
   */
  onClearCache() {
    modelManager.clearCache();
    this.addResult('缓存已清除', 'info');
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },
});
