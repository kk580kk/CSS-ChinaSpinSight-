const app = getApp()

Page({
  data: {
    recording: false,
    recordTime: 0,
    maxRecordTime: 5,
    cameraReady: false
  },

  ctx: null,
  recordTimer: null,

  onLoad() {
    this.initCamera()
  },

  onUnload() {
    if (this.recordTimer) {
      clearInterval(this.recordTimer)
    }
  },

  async initCamera() {
    try {
      this.ctx = wx.createCameraContext()
      this.setData({ cameraReady: true })
    } catch (err) {
      wx.showToast({
        title: '相机初始化失败',
        icon: 'none'
      })
    }
  },

  onStartRecord() {
    if (!this.ctx) return
    
    this.setData({ recording: true, recordTime: 0 })
    
    // Start recording
    this.ctx.startRecord({
      success: () => {
        // Start timer
        this.recordTimer = setInterval(() => {
          const newTime = this.data.recordTime + 1
          this.setData({ recordTime: newTime })
          
          if (newTime >= this.data.maxRecordTime) {
            this.onStopRecord()
          }
        }, 1000)
      },
      fail: (err) => {
        wx.showToast({
          title: '录制失败',
          icon: 'none'
        })
        this.setData({ recording: false })
      }
    })
  },

  onStopRecord() {
    if (!this.ctx) return
    
    clearInterval(this.recordTimer)
    this.recordTimer = null
    
    this.ctx.stopRecord({
      success: (res) => {
        const { tempVideoPath, tempThumbPath } = res
        
        wx.navigateTo({
          url: `/pages/preview/preview?videoPath=${encodeURIComponent(tempVideoPath)}&thumbPath=${encodeURIComponent(tempThumbPath)}`
        })
      },
      fail: (err) => {
        wx.showToast({
          title: '停止录制失败',
          icon: 'none'
        })
        this.setData({ recording: false, recordTime: 0 })
      }
    })
  },

  onCancel() {
    wx.navigateBack()
  },

  formatTime(seconds) {
    return `${seconds}.${Math.floor((seconds % 1) * 10)}s`
  }
})
