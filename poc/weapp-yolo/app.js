// app.js
App({
  onLaunch() {
    console.log('YOLO POC App Launch');
    
    // 检查文件系统权限
    this.checkFileSystem();
  },

  checkFileSystem() {
    const fs = wx.getFileSystemManager();
    const modelDir = `${wx.env.USER_DATA_PATH}/models`;
    
    try {
      fs.accessSync(modelDir);
      console.log('Model directory exists');
    } catch (e) {
      try {
        fs.mkdirSync(modelDir, true);
        console.log('Model directory created');
      } catch (err) {
        console.error('Failed to create model directory:', err);
      }
    }
  },

  globalData: {
    modelLoaded: false,
    modelPath: '',
    inferenceSession: null,
  },
});
