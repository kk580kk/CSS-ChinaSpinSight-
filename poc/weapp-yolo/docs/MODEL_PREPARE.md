# YOLOv5n 模型准备指南

## 方案选择

### 方案 A: 使用预训练 COCO 模型（推荐 POC 阶段）

**优点**:
- 立即可用
- 验证推理流程
- 检测通用物体（包括运动球类）

**下载地址**:
```
https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5n.pt
```

**转换为 ONNX**:
```python
import torch

# 加载模型
model = torch.hub.load('ultralytics/yolov5', 'yolov5n')

# 导出 ONNX
model.export(format='onnx', imgsz=320, half=False, simplify=True)
```

### 方案 B: 训练乒乓球专用模型

**需要数据**:
- 乒乓球图片数据集
- 标注文件（YOLO 格式）

**训练命令**:
```bash
python train.py --data pingpong.yaml --weights yolov5n.pt --epochs 100 --img 320
```

### 方案 C: 使用 INT8 量化模型

**量化命令**:
```python
# 使用 OpenVINO 或 TensorRT 进行 INT8 量化
python export.py --weights yolov5n.pt --include onnx --int8
```

## POC 建议

**第一阶段**: 使用方案 A（COCO 预训练模型），验证推理流程
**第二阶段**: 使用方案 B（专用模型），优化检测精度
**第三阶段**: 使用方案 C（INT8 量化），优化模型体积

## 模型上传 OSS

```bash
# 上传模型到阿里云 OSS
ossutil cp yolov5n.onnx oss://chinaspinsight/models/yolov5n-fp32.onnx
```

## 模型信息

| 模型 | 大小 | 精度 | 输入尺寸 |
|------|------|------|----------|
| yolov5n-fp32.onnx | ~7MB | FP32 | 640x640 |
| yolov5n-int8.onnx | ~2MB | INT8 | 320x320 |
