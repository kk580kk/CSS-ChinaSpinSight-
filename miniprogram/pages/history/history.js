// pages/history/history.js
const api = require('../../utils/api.js');

Page({
  data: {
    records: [],
    page: 1,
    size: 20,
    total: 0,
    loading: true,
    loadingMore: false,
    hasMore: true
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    // Refresh when back to this page
    this.setData({ page: 1 });
    this.loadHistory();
  },

  async loadHistory() {
    this.setData({ loading: true });
    try {
      const result = await api.detect.getHistory(this.data.page, this.data.size);
      this.setData({
        records: result.items || [],
        total: result.total,
        hasMore: result.items.length >= this.data.size,
        loading: false
      });
    } catch (err) {
      console.error('Load history error:', err);
      this.setData({ loading: false });
    }
  },

  async onLoadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    
    this.setData({ loadingMore: true });
    try {
      const nextPage = this.data.page + 1;
      const result = await api.detect.getHistory(nextPage, this.data.size);
      
      this.setData({
        page: nextPage,
        records: [...this.data.records, ...(result.items || [])],
        hasMore: result.items.length >= this.data.size,
        loadingMore: false
      });
    } catch (err) {
      console.error('Load more error:', err);
      this.setData({ loadingMore: false });
    }
  },

  onReachBottom() {
    this.onLoadMore();
  },

  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.loadHistory().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  getSpinLevel(rounds) {
    if (rounds < 1) return '弱旋转';
    if (rounds < 3) return '中等旋转';
    if (rounds < 5) return '强旋转';
    return '极强旋转';
  },

  getSpinEmoji(rounds) {
    if (rounds < 1) return '🌱';
    if (rounds < 3) return '🎯';
    if (rounds < 5) return '💪';
    return '🏆';
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Today
    if (diff < 86400000) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // Yesterday
    if (diff < 172800000) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // Other days
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  async onDelete(e) {
    const recordId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.detect.deleteHistory(recordId);
            const records = [...this.data.records];
            records.splice(index, 1);
            this.setData({ 
              records,
              total: this.data.total - 1
            });
            wx.showToast({ title: '已删除' });
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  onItemTap(e) {
    const taskId = e.currentTarget.dataset.task_id;
    wx.navigateTo({
      url: `/pages/result/result?task_id=${taskId}`
    });
  }
});
