// inference/ort-loader.js
// ONNX Runtime Web 动态加载器

const ORT_BASE_URL = 'https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/ort';

class OrtLoader {
  constructor() {
    this.ort = null;
    this.loaded = false;
  }

  /**
   * 动态加载 ONNX Runtime
   */
  async load() {
    if (this.loaded && this.ort) {
      return this.ort;
    }

    return new Promise((resolve, reject) => {
      // 使用 wx.request 加载 JS
      wx.request({
        url: `${ORT_BASE_URL}/ort.min.js`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              // 执行加载的 JS
              const ortModule = this.executeScript(res.data);
              this.ort = ortModule;
              this.loaded = true;
              console.log('ONNX Runtime loaded successfully');
              resolve(this.ort);
            } catch (err) {
              reject(new Error(`Failed to execute ONNX Runtime: ${err.message}`));
            }
          } else {
            reject(new Error(`Failed to load ONNX Runtime: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(new Error(`Network error: ${err.errMsg}`));
        },
      });
    });
  }

  /**
   * 执行加载的脚本
   */
  executeScript(scriptText) {
    // 在小程序中，我们需要将脚本内容包装成模块
    // 这里使用简化方式，实际可能需要更复杂的处理
    const module = { exports: {} };
    const exports = module.exports;
    
    // 执行脚本
    eval(scriptText);
    
    return module.exports || exports;
  }

  /**
   * 获取 ort 实例
   */
  getOrt() {
    return this.ort;
  }
}

// 单例
module.exports = new OrtLoader();
