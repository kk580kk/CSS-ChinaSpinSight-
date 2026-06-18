#!/bin/bash
# setup.sh - OSS Uploader 环境初始化脚本

set -e

echo "🚀 OSS Uploader 环境初始化"
echo "============================"

# 检查 Python 版本
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "📍 Python 版本: $PYTHON_VERSION"

# 创建虚拟环境
echo "📦 创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 虚拟环境创建成功"
else
    echo "⚠️  虚拟环境已存在"
fi

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source venv/bin/activate

# 升级 pip
echo "⬆️  升级 pip..."
pip install --upgrade pip

# 安装依赖
echo "📥 安装依赖..."
pip install -r requirements.txt

echo ""
echo "✅ 环境初始化完成！"
echo ""
echo "使用方法:"
echo "1. 激活环境: source venv/bin/activate"
echo "2. 配置环境变量:"
echo "   export OSS_ACCESS_KEY_ID=your-access-key-id"
echo "   export OSS_ACCESS_KEY_SECRET=your-access-key-secret"
echo "3. 上传文件: python src/upload.py --all"
echo ""
