// pages/loading/loading.js
const modelManager = require('../../utils/modelManager');

Page({
  data: {
    status: 'checking', // checking, downloading, loading, ready, error
    progress: 0,
    message: '检查模型...',
    errorMsg: '',
  },

  onLoad() {
    this.initModel();
  },

  async initModel() {
    try {
      // 步骤1: 检查模型
      this.setData({ status: 'checking', message: '检查本地模型...' });
      const checkResult = await modelManager.checkModel();
      
      if (checkResult.exists) {
        console.log('Model exists, loading...');
        this.setData({ status: 'loading', message: '加载模型...' });
        
        // 加载模型
        const app = getApp();
        const inference = require('../../utils/inference');
        
        await inference.initialize();
        await inference.loadModel(checkResult.path);
        
        app.globalData.modelLoaded = true;
        app.globalData.inferenceSession = inference;
        
        this.setData({ status: 'ready', message: '模型加载完成' });
        
        // 延迟跳转到相机页面
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/camera/camera',
          });
        }, 500);
        
      } else {
        console.log('Model not found, downloading...');
        this.downloadModel();
      }
    } catch (err) {
      console.error('Init failed:', err);
      this.setData({
        status: 'error',
        message: '初始化失败',
        errorMsg: err.message || '未知错误',
      });
    }
  },

  downloadModel() {
    this.setData({ status: 'downloading', message: '下载模型...', progress: 0 });
    
    modelManager.downloadModel((progress, written, total) => {
      this.setData({
        progress: progress,
        message: `下载模型 ${progress}% (${(written / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`,
      });
    }).then((result) => {
      console.log('Download complete:', result);
      // 下载完成，重新加载
      this.initModel();
    }).catch((err) => {
      console.error('Download failed:', err);
      this.setData({
        status: 'error',
        message: '模型下载失败',
        errorMsg: err.message || '网络错误',
      });
    });
  },

  onRetry() {
    this.setData({
      status: 'checking',
      progress: 0,
      message: '重新检查...',
      errorMsg: '',
    });
    this.initModel();
  },

  onClearCache() {
    modelManager.clearCache();
    wx.showToast({
      title: '缓存已清除',
      icon: 'success',
    });
    this.initModel();
  },
});
