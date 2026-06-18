# 模型上传指南

## OSS 地址
```
https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/
```

## 需要上传的文件

### 1. ONNX Runtime Web 文件
| 文件 | OSS 路径 | 说明 |
|------|----------|------|
| ort.min.js | /ort/ort.min.js | JS 接口 |
| ort-wasm.wasm | /ort/ort-wasm.wasm | WebAssembly |
| ort-wasm-simd.wasm | /ort/ort-wasm-simd.wasm | SIMD 加速版 |

### 2. YOLOv5n 模型
| 文件 | OSS 路径 | 说明 |
|------|----------|------|
| yolov5n-int8.onnx | /models/yolov5n-int8.onnx | INT8 量化模型 |
| yolov5n-fp32.onnx | /models/yolov5n-fp32.onnx | FP32 原始模型 |

## 上传命令示例

```bash
# 配置阿里云 CLI
aliyun configure

# 上传 ONNX Runtime
ossutil cp -r ./inference/ oss://chinaspinsight/ort/

# 上传模型
ossutil cp ./models/yolov5n-int8.onnx oss://chinaspinsight/models/
```

## 小程序中的 CDN URL

```javascript
// utils/modelManager.js
const MODEL_URL = 'https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/models/yolov5n-int8.onnx';

// 动态加载 ONNX Runtime
const ORT_URL = 'https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/ort/ort.min.js';
```

## 注意事项

1. **CORS 配置**: 需要配置 OSS 跨域访问
2. **CDN 加速**: 建议开启阿里云 CDN 加速
3. **版本管理**: 模型文件命名建议包含版本号
