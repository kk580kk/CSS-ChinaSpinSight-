const app = getApp()

Page({
  data: {
    history: [],
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    this.loadHistory()
  },

  async loadHistory() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const res = await app.request({
        url: '/api/v1/detect/history',
        data: { page: 1, size: 20 }
      })
      
      this.setData({
        history: res.data.items,
        hasMore: res.data.items.length < res.data.total
      })
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onStartDetect() {
    wx.navigateTo({
      url: '/pages/guide/guide'
    })
  },

  onViewHistory(e) {
    const { taskId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/result/result?taskId=${taskId}`
    })
  },

  getSpinLevelText(rounds) {
    if (rounds < 1) return '弱旋转'
    if (rounds < 3) return '中等旋转'
    if (rounds < 5) return '强旋转'
    return '极强旋转'
  },

  formatTime(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
})
