// pages/result/result.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    taskId: '',
    status: 'processing', // processing, completed, failed
    spinRounds: 0,
    confidence: 0,
    duration: 0,
    spinLevel: '',
    spinEmoji: '',
    loading: true,
    polling: null
  },

  onLoad(options) {
    const taskId = options.task_id || '';
    if (taskId) {
      this.setData({ taskId });
      this.startPolling(taskId);
    } else {
      this.setData({ 
        status: 'failed', 
        loading: false 
      });
    }
  },

  onUnload() {
    if (this.data.polling) {
      clearInterval(this.data.polling);
    }
  },

  startPolling(taskId) {
    // Poll status every 2 seconds
    const polling = setInterval(() => {
      this.checkStatus(taskId);
    }, 2000);
    
    this.setData({ polling });
    this.checkStatus(taskId);
  },

  async checkStatus(taskId) {
    try {
      const result = await api.detect.getStatus(taskId);
      
      if (result.status === 'completed') {
        clearInterval(this.data.polling);
        this.setData({ 
          status: 'completed',
          loading: false,
          spinRounds: result.result.spin_rounds,
          confidence: Math.round(result.result.confidence * 100),
          duration: result.result.duration
        });
        this.calculateSpinLevel(result.result.spin_rounds);
      } else if (result.status === 'failed') {
        clearInterval(this.data.polling);
        this.setData({ 
          status: 'failed', 
          loading: false 
        });
        wx.showToast({
          title: '检测失败，请重新拍摄',
          icon: 'none'
        });
      }
      // Otherwise still processing
    } catch (err) {
      console.error('Check status error:', err);
    }
  },

  calculateSpinLevel(rounds) {
    let level, emoji;
    if (rounds < 1) {
      level = '弱旋转';
      emoji = '🌱';
    } else if (rounds < 3) {
      level = '中等旋转';
      emoji = '🎯';
    } else if (rounds < 5) {
      level = '强旋转';
      emoji = '💪';
    } else {
      level = '极强旋转';
      emoji = '🏆';
    }
    this.setData({ 
      spinLevel: level,
      spinEmoji: emoji 
    });
  },

  // Save result (in MVP, just navigate back)
  async onSave() {
    wx.showToast({
      title: '已保存',
      icon: 'success'
    });
    // Could save to local storage here
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // Try again
  onRetry() {
    wx.redirectTo({
      url: '/pages/camera/camera'
    });
  }
});
