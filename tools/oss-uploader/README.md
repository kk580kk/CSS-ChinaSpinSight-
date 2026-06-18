# OSS Uploader Tool
# 阿里云 OSS 上传工具 - 用于 ChinaSpinSight 模型和依赖文件上传

## 安装

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

## 配置

编辑 `config/config.yaml`：

```yaml
oss:
  endpoint: "oss-cn-shanghai.aliyuncs.com"
  bucket: "chinaspinsight"
  # 从环境变量读取 AK/SK
  access_key_id: ${OSS_ACCESS_KEY_ID}
  access_key_secret: ${OSS_ACCESS_KEY_SECRET}
```

## 使用

```bash
# 上传所有文件
python src/upload.py --all

# 上传 ONNX Runtime
python src/upload.py --ort

# 上传模型
python src/upload.py --models

# 上传单个文件
python src/upload.py --file ./models/yolov5n.onnx --dest models/yolov5n.onnx
```

## 文件映射

| 本地文件 | OSS 路径 |
|----------|----------|
| `../poc/weapp-yolo/inference/ort.min.js` | `/ort/ort.min.js` |
| `../poc/weapp-yolo/inference/ort-wasm.wasm` | `/ort/ort-wasm.wasm` |
| `../poc/weapp-yolo/models/*.onnx` | `/models/` |

## 环境变量

```bash
export OSS_ACCESS_KEY_ID="your-access-key-id"
export OSS_ACCESS_KEY_SECRET="your-access-key-secret"
```
