#!/usr/bin/env python3
"""
OSS Uploader - 阿里云 OSS 文件上传工具
用于 ChinaSpinSight 项目模型和依赖文件上传
"""

import os
import sys
import yaml
import click
from pathlib import Path
from tqdm import tqdm

# 添加 SDK 路径 (如果本地安装)
try:
    import alibabacloud_oss_v2 as oss
except ImportError:
    print("错误: 请先安装阿里云 OSS SDK")
    print("pip install alibabacloud-oss-v2")
    sys.exit(1)


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
        
        # 替换环境变量
        config = self._replace_env_vars(config)
        return config
    
    def _replace_env_vars(self, obj):
        """递归替换环境变量"""
        if isinstance(obj, dict):
            return {k: self._replace_env_vars(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._replace_env_vars(item) for item in obj]
        elif isinstance(obj, str) and obj.startswith('${') and obj.endswith('}'):
            env_var = obj[2:-1]
            return os.environ.get(env_var, obj)
        return obj
    
    def _create_client(self) -> oss.Client:
        """创建 OSS 客户端"""
        oss_config = oss.Config(
            access_key_id=self.config['oss']['access_key_id'],
            access_key_secret=self.config['oss']['access_key_secret'],
            endpoint=self.config['oss']['endpoint'],
        )
        return oss.Client(oss_config)
    
    def upload_file(self, local_path: str, remote_path: str, 
                   show_progress: bool = True) -> bool:
        """上传单个文件"""
        local_file = Path(local_path)
        
        if not local_file.exists():
            print(f"❌ 文件不存在: {local_path}")
            return False
        
        file_size = local_file.stat().st_size
        
        try:
            if show_progress:
                with tqdm(total=file_size, unit='B', unit_scale=True, 
                         desc=f"上传 {local_file.name}") as pbar:
                    
                    def progress_callback(consumed_bytes, total_bytes):
                        pbar.update(consumed_bytes - pbar.n)
                    
                    self.client.put_object(
                        oss.PutObjectRequest(
                            bucket=self.config['oss']['bucket'],
                            key=remote_path,
                            body=open(local_path, 'rb'),
                            progress_fn=progress_callback,
                        )
                    )
            else:
                self.client.put_object(
                    oss.PutObjectRequest(
                        bucket=self.config['oss']['bucket'],
                        key=remote_path,
                        body=open(local_path, 'rb'),
                    )
                )
            
            print(f"✅ 上传成功: {remote_path}")
            return True
            
        except Exception as e:
            print(f"❌ 上传失败: {e}")
            return False
    
    def upload_mapping(self, mapping: dict) -> bool:
        """根据映射配置上传"""
        local_path = Path(__file__).parent.parent / mapping['local']
        remote_path = mapping['remote']
        
        print(f"\n📤 上传: {mapping['name']}")
        print(f"   本地: {local_path}")
        print(f"   远程: {remote_path}")
        
        if not local_path.exists():
            if mapping.get('required', False):
                print(f"❌ 必需文件不存在: {local_path}")
                return False
            else:
                print(f"⚠️  可选文件不存在，跳过: {local_path}")
                return True
        
        return self.upload_file(str(local_path), remote_path)
    
    def upload_all(self) -> bool:
        """上传所有配置的文件"""
        print("=" * 60)
        print("🚀 开始上传所有文件到 OSS")
        print(f"Bucket: {self.config['oss']['bucket']}")
        print(f"Endpoint: {self.config['oss']['endpoint']}")
        print("=" * 60)
        
        success_count = 0
        fail_count = 0
        
        for mapping in self.config['mappings']:
            if self.upload_mapping(mapping):
                success_count += 1
            else:
                fail_count += 1
        
        print("\n" + "=" * 60)
        print(f"📊 上传完成: 成功 {success_count}, 失败 {fail_count}")
        print("=" * 60)
        
        return fail_count == 0
    
    def upload_ort(self) -> bool:
        """上传 ONNX Runtime 文件"""
        print("🚀 上传 ONNX Runtime 文件...")
        
        success = True
        for mapping in self.config['mappings']:
            if 'ort' in mapping['name'].lower():
                if not self.upload_mapping(mapping):
                    success = False
        
        return success
    
    def upload_models(self) -> bool:
        """上传模型文件"""
        print("🚀 上传模型文件...")
        
        success = True
        for mapping in self.config['mappings']:
            if 'yolo' in mapping['name'].lower():
                if not self.upload_mapping(mapping):
                    success = False
        
        return success


@click.command()
@click.option('--all', 'upload_all_flag', is_flag=True, help='上传所有文件')
@click.option('--ort', 'upload_ort_flag', is_flag=True, help='上传 ONNX Runtime')
@click.option('--models', 'upload_models_flag', is_flag=True, help='上传模型文件')
@click.option('--file', 'file_path', type=click.Path(), help='上传单个文件')
@click.option('--dest', 'dest_path', help='OSS 目标路径')
@click.option('--config', 'config_path', default='config/config.yaml', 
              help='配置文件路径')
def main(upload_all_flag: bool, upload_ort_flag: bool, upload_models_flag: bool,
         file_path: str, dest_path: str, config_path: str):
    """OSS Uploader - 阿里云 OSS 文件上传工具"""
    
    # 检查环境变量
    if not os.environ.get('OSS_ACCESS_KEY_ID'):
        print("❌ 错误: 请设置环境变量 OSS_ACCESS_KEY_ID")
        print("export OSS_ACCESS_KEY_ID=your-access-key-id")
        sys.exit(1)
    
    if not os.environ.get('OSS_ACCESS_KEY_SECRET'):
        print("❌ 错误: 请设置环境变量 OSS_ACCESS_KEY_SECRET")
        print("export OSS_ACCESS_KEY_SECRET=your-access-key-secret")
        sys.exit(1)
    
    try:
        uploader = OSSUploader(config_path)
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        sys.exit(1)
    
    if upload_all_flag:
        success = uploader.upload_all()
    elif upload_ort_flag:
        success = uploader.upload_ort()
    elif upload_models_flag:
        success = uploader.upload_models()
    elif file_path and dest_path:
        success = uploader.upload_file(file_path, dest_path)
    else:
        print("❌ 请指定上传选项:")
        print("  --all       上传所有文件")
        print("  --ort       上传 ONNX Runtime")
        print("  --models    上传模型文件")
        print("  --file      上传单个文件")
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
