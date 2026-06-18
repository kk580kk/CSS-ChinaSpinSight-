// ChinaSpinSight API Utility
const API_BASE = 'https://api.chinaspinsight.com';

const app = getApp();

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('access_token');
    
    wx.request({
      url: API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          wx.showToast({
            title: res.data.message || '请求失败',
            icon: 'none'
          });
          reject(res.data);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

// Auth APIs
export const auth = {
  // WeChat login
  wechatLogin: (code) => request({
    url: '/api/v1/auth/wechat-login',
    method: 'POST',
    data: { code }
  }),
  
  // Get user profile
  getProfile: () => request({
    url: '/api/v1/user/profile'
  }),
  
  // Refresh token
  refreshToken: () => request({
    url: '/api/v1/auth/refresh',
    method: 'POST'
  })
};

// Upload APIs
export const upload = {
  // Get presigned URL for upload
  getPresignUrl: (filename, filesize, contentType) => request({
    url: '/api/v1/upload/presign',
    method: 'POST',
    data: {
      filename,
      filesize,
      content_type: contentType
    }
  }),
  
  // Upload file to presigned URL
  uploadToUrl: (url, filePath, contentType) => {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: url,
        filePath: filePath,
        name: 'file',
        header: { 'Content-Type': contentType },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.code === 0) {
            resolve(data.data);
          } else {
            reject(data);
          }
        },
        fail: reject
      });
    });
  },
  
  // Notify upload complete
  notifyComplete: (uploadId, fileKey, fileSize, duration) => request({
    url: '/api/v1/upload/callback',
    method: 'POST',
    data: {
      upload_id: uploadId,
      file_key: fileKey,
      file_size: fileSize,
      duration: duration
    }
  })
};

// Detect APIs
export const detect = {
  // Submit detection task
  submit: (fileKey, deviceInfo) => request({
    url: '/api/v1/detect/submit',
    method: 'POST',
    data: {
      file_key: fileKey,
      device_info: deviceInfo
    }
  }),
  
  // Get detection status
  getStatus: (taskId) => request({
    url: `/api/v1/detect/status/${taskId}`
  }),
  
  // Get detection result
  getResult: (taskId) => request({
    url: `/api/v1/detect/result/${taskId}`
  }),
  
  // Get detection history
  getHistory: (page = 1, size = 20) => request({
    url: `/api/v1/detect/history?page=${page}&size=${size}`
  }),
  
  // Delete history record
  deleteHistory: (recordId) => request({
    url: `/api/v1/detect/history/${recordId}`,
    method: 'DELETE'
  })
};

// User APIs
export const user = {
  // Get user info
  getProfile: () => request({
    url: '/api/v1/user/profile'
  })
};

export default {
  auth,
  upload,
  detect,
  user
};
