const app = getApp()

Page({
  data: {
    videoPath: '',
    thumbPath: '',
    uploading: false,
    uploadProgress: 0
  },

  onLoad(options) {
    this.setData({
      videoPath: decodeURIComponent(options.videoPath || ''),
      thumbPath: decodeURIComponent(options.thumbPath || '')
    })
  },

  onRetake() {
    wx.navigateBack()
  },

  async onConfirm() {
    this.setData({ uploading: true })
    
    try {
      // Step 1: Get presigned URL
      const stats = await this.getVideoStats(this.data.videoPath)
      
      const presignRes = await app.request({
        url: '/api/v1/upload/presign',
        method: 'POST',
        data: {
          filename: 'video.mp4',
          filesize: stats.size,
          content_type: 'video/mp4'
        }
      })
      
      const { upload_id, presign_url } = presignRes.data
      
      // Step 2: Upload video
      await this.uploadVideo(presign_url)
      
      // Step 3: Submit detection task
      const submitRes = await app.request({
        url: '/api/v1/detect/submit',
        method: 'POST',
        data: {
          file_key: presign_url.split('?')[0].split('/').pop(),
          device_info: {
            model: wx.getSystemInfoSync().model,
            fps: 30
          }
        }
      })
      
      const { task_id } = submitRes.data
      
      // Navigate to result page
      wx.redirectTo({
        url: `/pages/result/result?taskId=${task_id}`
      })
      
    } catch (err) {
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
      this.setData({ uploading: false })
    }
  },

  getVideoStats(videoPath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath: videoPath,
        success: resolve,
        fail: reject
      })
    })
  },

  uploadVideo(url) {
    return new Promise((resolve, reject) => {
      const uploadTask = wx.uploadFile({
        url: url,
        filePath: this.data.videoPath,
        name: 'file',
        success: resolve,
        fail: reject
      })
      
      uploadTask.onProgressUpdate((res) => {
        this.setData({ uploadProgress: res.progress })
      })
    })
  }
})
