#!/bin/bash
# download_and_upload.sh
# 一键下载 ONNX Runtime 并上传到 OSS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
POC_DIR="${PROJECT_ROOT}/../../poc/weapp-yolo"

echo "🚀 ChinaSpinSight OSS 上传工具"
echo "================================"

# 检查环境变量
if [ -z "$OSS_ACCESS_KEY_ID" ] || [ -z "$OSS_ACCESS_KEY_SECRET" ]; then
    echo "❌ 错误: 请设置环境变量 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET"
    echo ""
    echo "示例:"
    echo "  export OSS_ACCESS_KEY_ID=your-access-key-id"
    echo "  export OSS_ACCESS_KEY_SECRET=your...
    exit 1
fi

echo "✅ 环境变量检查通过"

# 激活虚拟环境
if [ -d "${PROJECT_ROOT}/venv" ]; then
    echo "🔄 激活虚拟环境..."
    source "${PROJECT_ROOT}/venv/bin/activate"
else
    echo "⚠️  虚拟环境不存在，请先运行: bash scripts/setup.sh"
    exit 1
fi

# 下载 ONNX Runtime
echo ""
echo "📥 步骤 1: 下载 ONNX Runtime Web..."
bash "${SCRIPT_DIR}/download_ort.sh"

# 上传文件
echo ""
echo "📤 步骤 2: 上传到 OSS..."
cd "${PROJECT_ROOT}"
python src/upload.py --all

echo ""
echo "✅ 全部完成！"
echo ""
echo "文件已上传到:"
echo "  - https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/ort/"
echo "  - https://chinaspinsight.oss-cn-shanghai.aliyuncs.com/models/"
