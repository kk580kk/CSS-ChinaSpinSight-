#!/bin/bash
# download_ort.sh - 下载 ONNX Runtime Web 文件

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFERENCE_DIR="${SCRIPT_DIR}/../../poc/weapp-yolo/inference"

VERSION="1.16.3"
BASE_URL="https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist"

echo "📥 下载 ONNX Runtime Web ${VERSION}"
echo "================================"

mkdir -p "${INFERENCE_DIR}"

cd "${INFERENCE_DIR}"

# 下载文件
files=(
    "ort.min.js"
    "ort-wasm.wasm"
    "ort-wasm-simd.wasm"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 已存在，跳过"
    else
        echo "⬇️  下载 $file..."
        curl -L -o "$file" "${BASE_URL}/${file}"
        echo "✅ $file 下载完成"
    fi
done

echo ""
echo "📊 下载完成，文件列表:"
ls -lh "${INFERENCE_DIR}"
