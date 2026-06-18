App({
  globalData: {
    userInfo: null,
    token: null,
    apiBase: 'https://api.chinaspinsight.com'
  },

  onLaunch() {
    // Check login status
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
    }
  },

  // API request wrapper
  request(options) {
    const { url, method = 'GET', data, header = {} } = options
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.apiBase}${url}`,
        method,
        data,
        header: {
          ...header,
          'Authorization': `Bearer ${this.globalData.token || ''}`
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 0) {
            resolve(res.data)
          } else {
            reject(res.data)
          }
        },
        fail: reject
      })
    })
  }
})
