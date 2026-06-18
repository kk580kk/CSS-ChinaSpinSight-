// pages/profile/profile.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    stats: {
      totalDetects: 0,
      avgRounds: 0
    }
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      const userInfo = await api.user.getProfile();
      this.setData({ userInfo });
    } catch (err) {
      console.error('Load user info error:', err);
      // Not logged in
    }
  },

  // WeChat login
  async onLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (res) => {
        // Get WeChat code for login
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          });
        });
        
        try {
          // Call login API
          const result = await api.auth.wechatLogin(loginRes.code);
          wx.setStorageSync('access_token', result.access_token);
          this.setData({ 
            userInfo: result.user,
            loggedIn: true 
          });
          wx.showToast({ title: '登录成功' });
        } catch (err) {
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      }
    });
  },

  onViewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  onViewGuide() {
    wx.navigateTo({
      url: '/pages/guide/guide'
    });
  },

  onFeedback() {
    wx.showModal({
      title: '意见反馈',
      editable: true,
      placeholderText: '请输入您的宝贵意见...',
      success: (res) => {
        if (res.confirm && res.content) {
          wx.showToast({ title: '感谢反馈' });
          // TODO: Submit feedback to server
        }
      }
    });
  },

  onAbout() {
    wx.showModal({
      title: '关于 ChinaSpinSight',
      content: '版本: 1.0.0\n\n轻量化 AI 乒乓球旋转视觉检测工具，让业余球友也能拥有专业级的旋转检测能力。',
      showCancel: false
    });
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({ userInfo: null });
          wx.showToast({ title: '已清除' });
        }
      }
    });
  }
});
