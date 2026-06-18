#!/bin/bash
# download_ort.sh
# 下载 ONNX Runtime Web 文件到本地（用于上传到 OSS）

VERSION="1.16.0"
BASE_URL="https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist"
OUTPUT_DIR="./inference"

echo "Downloading ONNX Runtime Web ${VERSION}..."

mkdir -p ${OUTPUT_DIR}

# 下载核心文件
curl -L -o ${OUTPUT_DIR}/ort.min.js ${BASE_URL}/ort.min.js
curl -L -o ${OUTPUT_DIR}/ort-wasm.wasm ${BASE_URL}/ort-wasm.wasm
curl -L -o ${OUTPUT_DIR}/ort-wasm-simd.wasm ${BASE_URL}/ort-wasm-simd.wasm

echo "Download complete!"
echo "Files:"
ls -lh ${OUTPUT_DIR}/
