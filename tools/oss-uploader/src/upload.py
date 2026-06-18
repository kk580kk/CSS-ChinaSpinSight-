#!/usr/bin/env python3
"""
OSS Uploader - 阿里云 OSS 文件上传工具
用于 ChinaSpinSight 项目模型和依赖文件上传
使用 alibabacloud-oss-v2 SDK
"""

import os
import sys
import yaml
import click
from pathlib import Path
from tqdm import tqdm

import alibabacloud_oss_v2 as oss
from alibabacloud_oss_v2.credentials import EnvironmentVariableCredentialsProvider


class OSSUploader:
    """OSS 上传器"""
    
    def __init__(self, config_path: str = "config/config.yaml"):
        """初始化上传器"""
        self.config = self._load_config(config_path)
        self.client = self._create_client()
        
    def _load_config(self, config_path: str) -> dict:
        """加载配置文件"""
        config_file = Path(__file__).parent.parent / config_path
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        return config
    
    def _create_client(self) -> oss.Client:
        """创建 OSS 客户端"""
        cfg = oss.config.load_default()
        cfg.credentials_provider = EnvironmentVariableCredentialsProvider()
        cfg.region = self.config['oss']['region']
        cfg.endpoint = f"https://{self.config['oss']['endpoint']}"
        return oss.Client(cfg)
    
    def upload_file(self, local_path: str, remote_path: str, 
                   show_progress: bool = True) -> bool:
        """上传单个文件"""
        local_file = Path(local_path)
        
        if not local_file.exists():
            print(f"❌ 文件不存在: {local_path}")
            return False
        
        file_size = local_file.stat().st_size
        bucket = self.config['oss']['bucket']
        
        try:
            # 读取文件内容
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            # 上传
            self.client.put_object(
                oss.PutObjectRequest(
                    bucket=bucket,
                    key=remote_path,
                    body=file_data,
                )
            )
            
            print(f"✅ 上传成功: {remote_path} ({file_size} bytes)")
            return True
            
        except Exception as e:
            print(f"❌ 上传失败: {e}")
            return False
    
    def upload_ort(self):
        """上传 ONNX Runtime 文件"""
        print("📤 上传 ONNX Runtime 文件...")
        
        ort_files = [
            ("../../poc/weapp-yolo/inference/ort.min.js", "ort/ort.min.js"),
            ("../../poc/weapp-yolo/inference/ort-wasm.wasm", "ort/ort-wasm.wasm"),
            ("../../poc/weapp-yolo/inference/ort-wasm-simd.wasm", "ort/ort-wasm-simd.wasm"),
        ]
        
        base_path = Path(__file__).parent.parent
        
        for local_rel, remote in ort_files:
            local_path = base_path / local_rel
            if local_path.exists():
                self.upload_file(str(local_path), remote)
            else:
                print(f"⚠️  跳过: {local_rel} 不存在")
    
    def upload_models(self):
        """上传模型文件"""
        print("📤 上传模型文件...")
        
        models_dir = Path(__file__).parent.parent / ".." / "poc" / "weapp-yolo" / "models"
        
        if not models_dir.exists():
            print(f"⚠️  模型目录不存在: {models_dir}")
            return
        
        for model_file in models_dir.glob("*.onnx"):
            remote_path = f"models/{model_file.name}"
            self.upload_file(str(model_file), remote_path)
    
    def list_files(self):
        """列出 OSS 文件"""
        print("📋 OSS 文件列表:")
        
        result = self.client.list_objects_v2(
            oss.ListObjectsV2Request(
                bucket=self.config['oss']['bucket'],
                max_keys=100
            )
        )
        
        if not result.contents:
            print("   (空)")
            return
        
        for obj in result.contents:
            size_mb = obj.size / 1024 / 1024
            print(f"   - {obj.key} ({size_mb:.2f} MB)")


@click.command()
@click.option('--all', 'upload_all_flag', is_flag=True, help='上传所有文件')
@click.option('--ort', 'upload_ort_flag', is_flag=True, help='上传 ONNX Runtime')
@click.option('--models', 'upload_models_flag', is_flag=True, help='上传模型文件')
@click.option('--file', 'file_path', help='上传单个文件')
@click.option('--dest', help='OSS 目标路径')
@click.option('--list', 'list_flag', is_flag=True, help='列出 OSS 文件')
@click.option('--config', default='config/config.yaml', help='配置文件路径')
def main(upload_all_flag, upload_ort_flag, upload_models_flag, file_path, dest, list_flag, config):
    """OSS Uploader - 阿里云 OSS 文件上传工具"""
    
    # 加载 .env 文件
    env_file = Path(__file__).parent.parent / '.env'
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    
    uploader = OSSUploader(config)
    
    if list_flag:
        uploader.list_files()
    elif upload_all_flag:
        uploader.upload_ort()
        uploader.upload_models()
    elif upload_ort_flag:
        uploader.upload_ort()
    elif upload_models_flag:
        uploader.upload_models()
    elif file_path and dest:
        uploader.upload_file(file_path, dest)
    else:
        click.echo("请指定操作: --all, --ort, --models, --file, 或 --list")
        click.echo("使用 --help 查看帮助")


if __name__ == '__main__':
    main()
