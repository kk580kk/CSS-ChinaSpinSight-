// pages/camera/camera.js
const modelManager = require('../../utils/modelManager');

Page({
  data: {
    isReady: false,
    isDetecting: false,
    fps: 0,
    inferenceTime: 0,
    detections: [],
    recording: false,
    recordTime: 0,
    showStats: true,
  },

  cameraContext: null,
  inferenceEngine: null,
  frameListener: null,
  recordTimer: null,
  lastFrameTime: 0,
  frameCount: 0,
  fpsTimer: null,

  onLoad() {
    // 检查模型是否加载
    const app = getApp();
    if (!app.globalData.modelLoaded) {
      wx.redirectTo({
        url: '/pages/loading/loading',
      });
      return;
    }

    this.inferenceEngine = app.globalData.inferenceSession;
    this.setData({ isReady: true });
  },

  onReady() {
    // 初始化摄像头
    this.cameraContext = wx.createCameraContext();
    
    // 开始 FPS 计算
    this.startFpsCalculation();
  },

  onUnload() {
    this.stopDetection();
    this.stopRecording();
    this.stopFpsCalculation();
    
    if (this.inferenceEngine) {
      this.inferenceEngine.dispose();
    }
  },

  /**
   * 开始 FPS 计算
   */
  startFpsCalculation() {
    this.fpsTimer = setInterval(() => {
      const fps = this.frameCount;
      this.setData({ fps });
      this.frameCount = 0;
    }, 1000);
  },

  /**
   * 停止 FPS 计算
   */
  stopFpsCalculation() {
    if (this.fpsTimer) {
      clearInterval(this.fpsTimer);
      this.fpsTimer = null;
    }
  },

  /**
   * 开始检测
   */
  onStartDetection() {
    if (this.data.isDetecting) return;

    this.setData({ isDetecting: true });
    
    // 监听摄像头帧
    this.frameListener = this.cameraContext.onCameraFrame((frame) => {
      this.processFrame(frame);
    });
    
    this.frameListener.start();
    console.log('Detection started');
  },

  /**
   * 停止检测
   */
  onStopDetection() {
    if (!this.data.isDetecting) return;

    this.stopDetection();
    this.setData({ 
      isDetecting: false,
      detections: [],
    });
  },

  stopDetection() {
    if (this.frameListener) {
      this.frameListener.stop();
      this.frameListener = null;
    }
  },

  /**
   * 处理帧
   */
  async processFrame(frame) {
    const startTime = Date.now();
    
    try {
      // 降采样处理 (每3帧处理1帧，控制性能)
      this.frameCount++;
      if (this.frameCount % 3 !== 0) return;

      // 获取帧数据
      const { width, height, data } = frame;
      
      // 执行推理
      const result = await this.inferenceEngine.infer(data, width, height);
      
      // 更新检测结果
      this.setData({
        detections: result.detections,
        inferenceTime: result.inferenceTime,
      });

    } catch (err) {
      console.error('Frame processing error:', err);
    }
  },

  /**
   * 开始录像
   */
  onStartRecord() {
    if (this.data.recording) return;

    this.cameraContext.startRecord({
      success: () => {
        console.log('Recording started');
        this.setData({ recording: true, recordTime: 0 });
        
        // 计时
        this.recordTimer = setInterval(() => {
          this.setData({ recordTime: this.data.recordTime + 1 });
        }, 1000);
      },
      fail: (err) => {
        console.error('Start record failed:', err);
        wx.showToast({
          title: '录像失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 停止录像
   */
  onStopRecord() {
    if (!this.data.recording) return;

    this.cameraContext.stopRecord({
      success: (res) => {
        console.log('Recording stopped:', res);
        this.stopRecording();
        this.setData({ recording: false, recordTime: 0 });
        
        // 预览视频
        wx.previewMedia({
          sources: [{ url: res.tempVideoPath, type: 'video' }],
        });
      },
      fail: (err) => {
        console.error('Stop record failed:', err);
        this.stopRecording();
        this.setData({ recording: false });
      },
    });
  },

  stopRecording() {
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }
  },

  /**
   * 切换统计信息显示
   */
  onToggleStats() {
    this.setData({ showStats: !this.data.showStats });
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 格式化时间
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
});
