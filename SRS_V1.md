# ChinaSpinSight SRS V1.0
# 软件需求规格说明书

**项目**: 轻量化 AI 乒乓球旋转视觉检测训练设备  
**文档版本**: V1.0  
**编制**: 产品规划部  
**日期**: 2026-06-18  
**阶段**: MVP 原型开发  

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | ChinaSpinSight SRS V1.0 |
| 产品名称 | ChinaSpinSight（乒乓球旋转视觉检测） |
| 版本 | V1.0 |
| 状态 | 草案 |
| 作者 | 产品规划部 |
| 关联文档 | PRD_V1.md, MVP_Requirements_V1.md |

---

## 1. 系统概述

### 1.1 系统架构

ChinaSpinSight MVP 采用前后端分离架构，由微信小程序客户端、云端推理服务、数据存储服务三部分组成。

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  微信小程序  │  │  微信小程序  │  │  微信小程序  │         │
│  │  (用户A)     │  │  (用户B)     │  │  (用户C)     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ HTTPS/JSON
┌──────────────────────────┼──────────────────────────────────┐
│                     服务层                               │
│  ┌───────────────────────┴──────────────────────────┐     │
│  │              API Gateway (Nginx)                  │     │
│  └───────────────────────┬──────────────────────────┘     │
│                          │                                 │
│  ┌───────────────────────┼──────────────────────────┐     │
│  │                  FastAPI 服务                      │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │     │
│  │  │  用户模块    │  │  检测模块    │  │  上传模块  │ │     │
│  │  └─────────────┘  └──────┬──────┘  └───────────┘ │     │
│  │                          │                        │     │
│  │                   ┌──────┴──────┐                 │     │
│  │                   │  AI 推理引擎 │                 │     │
│  │                   │ (YOLOv5n)   │                 │     │
│  │                   └─────────────┘                 │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                     数据层                               │
│  ┌───────────────────────┴──────────────────────────┐     │
│  │              数据库 (SQLite/PostgreSQL)           │     │
│  │  ┌─────────────┐  ┌─────────────┐                │     │
│  │  │  用户表      │  │  检测记录表  │                │     │
│  │  └─────────────┘  └─────────────┘                │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │              对象存储 (MinIO/AWS S3)              │     │
│  │  ┌─────────────┐  ┌─────────────┐                │     │
│  │  │  视频文件    │  │  结果截图    │                │     │
│  │  └─────────────┘  └─────────────┘                │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 客户端 | 微信小程序 | 原生小程序开发 |
| 前端框架 | 微信原生 / Taro | 视开发团队技术栈而定 |
| API 框架 | FastAPI (Python) | 高性能异步框架 |
| AI 推理 | PyTorch + OpenCV | YOLOv5n 目标检测 |
| 数据库 | PostgreSQL | 关系型数据存储 |
| 缓存 | Redis | 会话、限流、缓存 |
| 对象存储 | MinIO / AWS S3 | 视频文件存储 |
| 容器化 | Docker + Docker Compose | 部署编排 |
| 反向代理 | Nginx | 负载均衡、SSL |

---

## 2. 系统架构设计

### 2.1 客户端架构

```
微信小程序
├── pages/
│   ├── index/           # 首页（历史记录）
│   ├── guide/           # 拍摄引导
│   ├── camera/          # 拍摄页面
│   ├── preview/         # 视频预览
│   ├── result/          # 检测结果
│   ├── history/         # 历史详情
│   └── profile/         # 个人中心
├── components/          # 公共组件
├── utils/
│   ├── api.js           # API 封装
│   ├── auth.js          # 认证工具
│   └── storage.js       # 本地存储
└── app.js               # 小程序入口
```

### 2.2 服务端架构

```
server/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 应用入口
│   ├── config.py        # 配置管理
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py      # 依赖注入
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py  # 认证接口
│   │   │   ├── detect.py # 检测接口
│   │   │   ├── upload.py # 上传接口
│   │   │   └── user.py  # 用户接口
│   ├── core/
│   │   ├── security.py  # 安全相关
│   │   └── exceptions.py # 异常处理
│   ├── models/          # 数据模型
│   ├── schemas/         # Pydantic 模型
│   ├── services/        # 业务逻辑
│   │   ├── auth.py
│   │   ├── detect.py
│   │   └── storage.py
│   └── ai/
│       ├── detector.py  # YOLO 检测器
│       ├── tracker.py   # 球体追踪
│       └── spin.py      # 旋转计算
├── tests/
├── Dockerfile
└── requirements.txt
```

---

## 3. API 接口定义

### 3.1 接口规范

**基础信息**:
- 协议: HTTPS
- 数据格式: JSON
- 字符编码: UTF-8
- 认证方式: JWT Token

**响应格式**:
```json
{
  "code": 0,           // 0 表示成功，非 0 表示错误
  "message": "success", // 错误信息
  "data": {}           // 业务数据
}
```

**HTTP 状态码**:
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token 过期 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 3.2 认证接口

#### 3.2.1 微信登录

```http
POST /api/v1/auth/wechat-login
```

**请求参数**:
```json
{
  "code": "wx_auth_code_xxx"  // 微信授权码
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "user_xxx",
      "openid": "openid_xxx",
      "nickname": "用户昵称",
      "avatar_url": "https://..."
    }
  }
}
```

#### 3.2.2 Token 刷新

```http
POST /api/v1/auth/refresh
```

**请求头**:
```
Authorization: Bearer {refresh_token}
```

### 3.3 上传接口

#### 3.3.1 获取上传凭证

```http
POST /api/v1/upload/presign
```

**请求参数**:
```json
{
  "filename": "video_123.mp4",
  "filesize": 5242880,  // 字节
  "content_type": "video/mp4"
}
```

**响应数据**:
```json
{
  "code": 0,
  "data": {
    "upload_id": "upload_xxx",
    "presign_url": "https://s3.amazonaws.com/...",  // 直传地址
    "callback_url": "https://api.chinaspinsight.com/callback",
    "expires_in": 600
  }
}
```

#### 3.3.2 上传完成回调

```http
POST /api/v1/upload/callback
```

**请求参数**:
```json
{
  "upload_id": "upload_xxx",
  "file_key": "videos/user_xxx/video_123.mp4",
  "file_size": 5242880,
  "duration": 5.2
}
```

### 3.4 检测接口

#### 3.4.1 提交检测任务

```http
POST /api/v1/detect/submit
```

**请求参数**:
```json
{
  "file_key": "videos/user_xxx/video_123.mp4",
  "device_info": {
    "model": "iPhone14,2",
    "fps": 240,
    "resolution": "1920x1080"
  }
}
```

**响应数据**:
```json
{
  "code": 0,
  "data": {
    "task_id": "task_xxx",
    "status": "pending",  // pending, processing, completed, failed
    "created_at": "2026-06-18T10:00:00Z"
  }
}
```

#### 3.4.2 查询检测状态

```http
GET /api/v1/detect/status/{task_id}
```

**响应数据**:
```json
{
  "code": 0,
  "data": {
    "task_id": "task_xxx",
    "status": "completed",
    "progress": 100,
    "result": {
      "spin_rounds": 3.5,
      "confidence": 0.92,
      "duration": 0.8,
      "trajectory": [...],
      "thumbnail_url": "https://..."
    },
    "created_at": "2026-06-18T10:00:00Z",
    "completed_at": "2026-06-18T10:00:05Z"
  }
}
```

#### 3.4.3 获取检测结果

```http
GET /api/v1/detect/result/{task_id}
```

### 3.5 用户接口

#### 3.5.1 获取用户信息

```http
GET /api/v1/user/profile
```

#### 3.5.2 获取历史记录

```http
GET /api/v1/user/history?page=1&size=20
```

**响应数据**:
```json
{
  "code": 0,
  "data": {
    "total": 156,
    "page": 1,
    "size": 20,
    "items": [
      {
        "id": "record_xxx",
        "task_id": "task_xxx",
        "spin_rounds": 3.5,
        "confidence": 0.92,
        "duration": 0.8,
        "created_at": "2026-06-18T10:00:00Z",
        "thumbnail_url": "https://..."
      }
    ]
  }
}
```

#### 3.5.3 删除历史记录

```http
DELETE /api/v1/user/history/{record_id}
```

---

## 4. 数据库设计

### 4.1 ER 图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   detect    │       │   videos    │
├─────────────┤       │   records   │       ├─────────────┤
│ id (PK)     │◄──────┤ id (PK)     │       │ id (PK)     │
│ openid      │       │ user_id(FK) │──────►│ record_id   │
│ nickname    │       │ video_id    │──────►│ file_key    │
│ avatar_url  │       │ task_id     │       │ file_size   │
│ created_at  │       │ spin_rounds │       │ duration    │
│ updated_at  │       │ confidence  │       │ created_at  │
└─────────────┘       │ duration    │       └─────────────┘
                      │ status      │
                      │ created_at  │
                      │ updated_at  │
                      └─────────────┘
```

### 4.2 表结构

#### 4.2.1 用户表 (users)

```sql
CREATE TABLE users (
    id              VARCHAR(32) PRIMARY KEY,
    openid          VARCHAR(64) UNIQUE NOT NULL,
    unionid         VARCHAR(64),
    nickname        VARCHAR(64),
    avatar_url      VARCHAR(256),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_openid (openid)
);
```

#### 4.2.2 检测记录表 (detect_records)

```sql
CREATE TABLE detect_records (
    id              VARCHAR(32) PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL,
    video_id        VARCHAR(32) NOT NULL,
    task_id         VARCHAR(32) UNIQUE NOT NULL,
    spin_rounds     DECIMAL(4,2),           -- 旋转圈数
    confidence      DECIMAL(3,2),           -- 置信度 0-1
    duration        DECIMAL(4,2),           -- 飞行时长(秒)
    trajectory      JSON,                   -- 轨迹数据
    status          VARCHAR(20) DEFAULT 'pending', -- pending/processing/completed/failed
    error_msg       TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_created (user_id, created_at DESC),
    INDEX idx_status (status)
);
```

#### 4.2.3 视频文件表 (videos)

```sql
CREATE TABLE videos (
    id              VARCHAR(32) PRIMARY KEY,
    record_id       VARCHAR(32),
    file_key        VARCHAR(256) NOT NULL,
    file_size       BIGINT,
    duration        DECIMAL(4,2),
    width           INT,
    height          INT,
    fps             INT,
    thumbnail_key   VARCHAR(256),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (record_id) REFERENCES detect_records(id),
    INDEX idx_record (record_id)
);
```

#### 4.2.4 任务队列表 (detect_tasks)

```sql
CREATE TABLE detect_tasks (
    id              VARCHAR(32) PRIMARY KEY,
    video_id        VARCHAR(32) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    priority        INT DEFAULT 0,
    retry_count     INT DEFAULT 0,
    result          JSON,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    
    INDEX idx_status_created (status, created_at),
    INDEX idx_priority (priority DESC, created_at)
);
```

---

## 5. AI 算法设计

### 5.1 算法流程

```
输入: 视频文件 (MP4, 5秒, 120-240fps)
  ↓
预处理:
  - 视频解码 → 帧序列
  - ROI 裁剪 (球网附近区域)
  - 图像增强 (亮度/对比度)
  ↓
目标检测 (YOLOv5n):
  - 检测乒乓球位置
  - 输出: [x, y, w, h, confidence]
  ↓
球体追踪:
  - 帧间匹配，建立轨迹
  - 卡尔曼滤波平滑
  ↓
旋转检测:
  - 提取球体表面标记点
  - 帧间特征点匹配
  - 计算旋转角度
  - 累加得到总圈数
  ↓
输出: {
  spin_rounds: 3.5,
  confidence: 0.92,
  trajectory: [...],
  duration: 0.8
}
```

### 5.2 模型规格

| 组件 | 模型 | 输入尺寸 | 输出 | 推理时间 |
|------|------|----------|------|----------|
| 目标检测 | YOLOv5n | 640x640 | 边界框+置信度 | ~10ms |
| 特征提取 | 自定义 CNN | 128x128 | 特征向量 | ~5ms |
| 旋转计算 | 几何算法 | - | 旋转角度 | ~1ms |

### 5.3 性能指标

| 指标 | 目标值 | 测试方法 |
|------|--------|----------|
| 检测精度 | 误差 ≤1 圈 | 与人工标注对比 |
| 处理速度 | ≤5 秒/视频 | 5秒视频端到端 |
| 召回率 | ≥95% | 有效球检测率 |
| 误检率 | ≤5% | 非球体误识别率 |

---

## 6. 部署架构

### 6.1 服务器配置

**MVP 阶段推荐配置**:

| 组件 | 配置 | 说明 |
|------|------|------|
| API 服务器 | 2核4G | FastAPI 服务 |
| GPU 服务器 | 4核8G + T4 GPU | AI 推理服务 |
| 数据库 | 2核4G | PostgreSQL |
| 对象存储 | 100GB | MinIO/S3 |

### 6.2 Docker Compose 配置

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api

  api:
    build: ./server
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/chinaspinsight
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=minio:9000
    depends_on:
      - db
      - redis
      - minio

  worker:
    build: ./server
    command: celery -A app.ai.worker worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/chinaspinsight
    depends_on:
      - db
      - redis
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=chinaspinsight
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    environment:
      - MINIO_ROOT_USER=minio
      - MINIO_ROOT_PASSWORD=minio123

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 7. 性能指标

### 7.1 系统性能指标

| 指标 | 目标值 | 测试条件 |
|------|--------|----------|
| API 响应时间 | P99 < 200ms | 正常负载 |
| 并发用户数 | ≥100 | 同时在线 |
| 日检测量 | ≥1000 次 | 单服务器 |
| 系统可用性 | ≥99.5% | 月度统计 |
| 数据持久性 | ≥99.99% | 备份策略 |

### 7.2 AI 推理性能

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 单视频处理时间 | ≤5 秒 | 5秒视频 |
| GPU 利用率 | ≥60% | 平均负载 |
| 队列等待时间 | ≤30 秒 | 峰值时段 |
| 内存占用 | ≤4GB | 单推理进程 |

### 7.3 存储性能

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 视频上传速度 | ≥500KB/s | 平均网速 |
| 存储空间 | 100GB | MVP 阶段 |
| 数据保留期 | 30 天 | 自动清理 |

---

## 8. 安全与隐私

### 8.1 认证安全

- JWT Token 有效期: Access Token 24 小时，Refresh Token 7 天
- Token 传输: HTTPS Only
- 敏感操作: 二次验证

### 8.2 数据安全

- 用户视频: 仅用户本人可访问，URL 带签名过期
- 数据加密: 传输 TLS 1.3，存储 AES-256
- 备份策略: 每日增量备份，每周全量备份

### 8.3 隐私合规

- 遵循《个人信息保护法》
- 微信小程序隐私协议
- 用户数据可导出、可删除
- 未成年人数据处理符合规定

---

## 9. 监控与告警

### 9.1 监控指标

| 类别 | 指标 | 告警阈值 |
|------|------|----------|
| 系统 | CPU 使用率 | > 80% |
| 系统 | 内存使用率 | > 85% |
| 系统 | 磁盘使用率 | > 85% |
| 应用 | API 错误率 | > 1% |
| 应用 | API 响应时间 | P99 > 500ms |
| 业务 | 检测失败率 | > 10% |
| 业务 | 队列堆积 | > 100 任务 |

### 9.2 日志规范

```json
{
  "timestamp": "2026-06-18T10:00:00.000Z",
  "level": "INFO",
  "service": "api",
  "trace_id": "trace_xxx",
  "user_id": "user_xxx",
  "method": "POST",
  "path": "/api/v1/detect/submit",
  "status_code": 200,
  "duration_ms": 150,
  "message": "Detection task submitted"
}
```

---

## 10. 附录

### 10.1 术语表

| 术语 | 说明 |
|------|------|
| JWT | JSON Web Token，认证令牌 |
| ROI | Region of Interest，感兴趣区域 |
| YOLO | You Only Look Once，目标检测算法 |
| FPS | Frames Per Second，帧率 |
| NPU | Neural Processing Unit，神经网络处理器 |

### 10.2 修订记录

| 版本 | 日期 | 作者 | 修改内容 |
|------|------|------|----------|
| V1.0 | 2026-06-18 | 产品规划部 | 初始版本 |

### 10.3 关联文档

- 产品需求文档: `/Volumes/Serene 2T/Workspaces/Company/Product/ChinaSpinSight/PRD_V1.md`
- MVP 商业需求: `/Volumes/Serene 2T/Workspaces/Company/Marketing/ChinaSpinSight/MVP_Requirements_V1.md`
- 工程地址: `github.com/kk580kk/CSS-ChinaSpinSight-`

---

*本文档由产品规划部编制，基于 PRD V1 细化技术实现方案。*
