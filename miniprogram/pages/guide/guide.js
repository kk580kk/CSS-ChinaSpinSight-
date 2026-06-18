Page({
  data: {
    steps: [
      {
        num: 1,
        text: '将手机固定在球台侧面，高度与球网平齐'
      },
      {
        num: 2,
        text: '镜头横向对准球网区域'
      },
      {
        num: 3,
        text: '使用配套标记球进行发球'
      },
      {
        num: 4,
        text: '点击"开始检测"后发球'
      }
    ]
  },

  onStartDetect() {
    wx.navigateTo({
      url: '/pages/camera/camera'
    })
  },

  onBack() {
    wx.navigateBack()
  }
})
