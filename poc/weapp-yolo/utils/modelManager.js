// utils/modelManager.js

const MODEL_URL = 'https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/models/yolov5n-int8.onnx';
const MODEL_FILE_NAME = 'yolov5n-int8.onnx';
const MODEL_VERSION = '1.0.0';

class ModelManager {
  constructor() {
    this.fs = wx.getFileSystemManager();
    this.modelDir = `${wx.env.USER_DATA_PATH}/models`;
    this.modelPath = `${this.modelDir}/${MODEL_FILE_NAME}`;
    this.versionKey = 'model_version';
  }

  /**
   * 检查模型是否存在且版本正确
   */
  async checkModel() {
    try {
      // 检查文件是否存在
      await this.fs.accessSync(this.modelPath);
      
      // 检查版本
      const savedVersion = wx.getStorageSync(this.versionKey);
      if (savedVersion === MODEL_VERSION) {
        console.log('Model exists and version matches');
        return { exists: true, path: this.modelPath };
      }
      
      console.log('Model version mismatch, need update');
      return { exists: false, needUpdate: true };
    } catch (e) {
      console.log('Model not found');
      return { exists: false, needUpdate: false };
    }
  }

  /**
   * 下载模型
   */
  async downloadModel(onProgress) {
    return new Promise((resolve, reject) => {
      console.log('Starting model download from:', MODEL_URL);
      
      const downloadTask = wx.downloadFile({
        url: MODEL_URL,
        success: (res) => {
          if (res.statusCode === 200) {
            // 保存到本地
            this.saveModel(res.tempFilePath)
              .then(() => {
                wx.setStorageSync(this.versionKey, MODEL_VERSION);
                resolve({ success: true, path: this.modelPath });
              })
              .catch(reject);
          } else {
            reject(new Error(`Download failed with status ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('Download failed:', err);
          reject(err);
        },
      });

      // 监听下载进度
      if (onProgress && downloadTask) {
        downloadTask.onProgressUpdate((res) => {
          onProgress(res.progress, res.totalBytesWritten, res.totalBytesExpectedToWrite);
        });
      }
    });
  }

  /**
   * 保存模型到本地
   */
  async saveModel(tempPath) {
    return new Promise((resolve, reject) => {
      // 确保目录存在
      try {
        this.fs.accessSync(this.modelDir);
      } catch (e) {
        try {
          this.fs.mkdirSync(this.modelDir, true);
        } catch (err) {
          reject(new Error(`Failed to create directory: ${err.message}`));
          return;
        }
      }

      // 复制文件
      this.fs.copyFile({
        srcPath: tempPath,
        destPath: this.modelPath,
        success: () => {
          console.log('Model saved to:', this.modelPath);
          resolve();
        },
        fail: (err) => {
          reject(new Error(`Failed to save model: ${err.errMsg}`));
        },
      });
    });
  }

  /**
   * 获取模型路径
   */
  getModelPath() {
    return this.modelPath;
  }

  /**
   * 获取模型信息
   */
  getModelInfo() {
    try {
      const stats = this.fs.statSync(this.modelPath);
      return {
        path: this.modelPath,
        size: stats.size,
        version: wx.getStorageSync(this.versionKey),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * 清理模型缓存
   */
  clearCache() {
    try {
      this.fs.unlinkSync(this.modelPath);
      wx.removeStorageSync(this.versionKey);
      console.log('Model cache cleared');
      return true;
    } catch (e) {
      console.error('Failed to clear cache:', e);
      return false;
    }
  }
}

module.exports = new ModelManager();
