# Docker 打包和部署指南

## 📦 Docker 构建

### 快速开始

#### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 停止容器
docker-compose down
```

#### 方式二：使用 Docker 命令

```bash
# 1. 构建镜像
docker build -t docker-copilot-frontend:latest .

# 2. 运行容器（带 config 卷挂载）
docker run -d \
  --name docker-copilot-frontend \
  -p 12713:12713 \
  -v $(pwd)/config:/app/dist/config \
  --restart unless-stopped \
  docker-copilot-frontend:latest

# 3. 查看日志
docker logs -f docker-copilot-frontend

# 4. 停止容器
docker stop docker-copilot-frontend

# 5. 删除容器
docker rm docker-copilot-frontend

# 6. 删除镜像
docker rmi docker-copilot-frontend:latest
```

## 🏗️ 镜像详解

### 多阶段构建架构

项目使用了**多阶段构建**（Multi-stage Build）来优化镜像大小：

```
┌─────────────────────────────────┐
│  第一阶段：Builder (构建阶段)    │
├─────────────────────────────────┤
│ - Node 18 Alpine                │
│ - 安装依赖                       │
│ - 构建生产版本                   │
│ - 最终产物：dist/                │
└─────────────────────────────────┘
             ↓
┌─────────────────────────────────┐
│  第二阶段：Production (运行阶段) │
├─────────────────────────────────┤
│ - Node 18 Alpine                │
│ - Serve HTTP服务器              │
│ - 只复制 dist/ 文件夹            │
│ - 最小化镜像大小                 │
└─────────────────────────────────┘
```

### 为什么使用多阶段构建？

✅ **大幅减少镜像大小** - 只包含生产所需的文件
✅ **提高安全性** - 不包含源代码和构建工具
✅ **加快启动速度** - 更小的镜像下载更快
✅ **优化存储空间** - 减少磁盘占用

### 镜像大小对比

- 使用多阶段构建：~100MB
- 不使用多阶段构建：~500MB+

## 🐳 Docker Compose 配置详解

### 服务配置

```yaml
services:
  docker-copilot-frontend:
    # 构建配置
    build:
      context: .                    # 构建上下文
      dockerfile: Dockerfile        # Dockerfile 路径
    
    # 容器名称
    container_name: docker-copilot-frontend
    
    # 端口映射
    ports:
      - "12713:12713"               # 主机端口:容器端口
    
    # 环境变量
    environment:
      - NODE_ENV=production
    
    # 重启策略
    restart: unless-stopped         # 除非手动停止，否则自动重启
    
    # 网络
    networks:
      - docker-copilot-network
    
    # 健康检查
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:12713/"]
      interval: 30s                 # 每30秒检查一次
      timeout: 10s                  # 超时时间
      retries: 3                    # 失败3次后标记为不健康
      start_period: 5s              # 启动后5秒才开始检查
```

## 🚀 环境配置

### 环境变量说明

编辑 `.env` 文件配置应用：

```bash
# API 后端地址
VITE_API_BASE_URL=http://192.168.50.4:12712

# 应用监听端口
VITE_PORT=12713

# 环境标志
VITE_DEV=false
```

### 在 Docker 中传递环境变量

```bash
# 方式一：环境变量文件
docker run -d \
  --env-file .env \
  -p 12713:12713 \
  docker-copilot-frontend:latest

# 方式二：命令行参数
docker run -d \
  -e VITE_API_BASE_URL=http://backend:12712 \
  -p 12713:12713 \
  docker-copilot-frontend:latest

# 方式三：Docker Compose
# 在 docker-compose.yml 中配置 environment 部分
```

## 📊 常用命令

### 镜像管理

```bash
# 查看本地镜像
docker images

# 搜索镜像
docker search docker-copilot

# 删除镜像
docker rmi docker-copilot-frontend:latest

# 镜像打标签
docker tag docker-copilot-frontend:latest docker-copilot-frontend:v1.0.0

# 推送镜像到仓库
docker push your-registry/docker-copilot-frontend:latest
```

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a

# 查看容器日志
docker logs docker-copilot-frontend

# 实时查看日志
docker logs -f docker-copilot-frontend

# 进入容器终端
docker exec -it docker-copilot-frontend sh

# 检查容器状态
docker inspect docker-copilot-frontend

# 查看容器资源使用情况
docker stats docker-copilot-frontend
```

### Docker Compose 命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 删除容器和网络
docker-compose down -v

# 查看服务状态
docker-compose ps
```

## 📁 配置文件映射

### Config 文件夹卷挂载

项目 `src/config` 文件夹会被映射到容器外，允许你在主机上修改配置文件，容器会自动加载更新。

#### 卷挂载路径

- **主机路径**: `./config` (项目根目录下的 config 文件夹)
- **容器路径**: `/app/dist/config` (容器内部的配置路径)

#### 使用示例

```bash
# Docker Compose 会自动处理卷挂载
docker-compose up -d

# 修改主机上的 config 文件
# ./config/imageLogos.js 的修改会立即在容器中生效
```

#### 手动创建 config 文件夹

如果主机上没有 `config` 文件夹，可以从容器中复制：

```bash
# 启动容器后复制 config 文件夹到主机
docker cp docker-copilot-frontend:/app/dist/config ./config

# 或者手动创建并配置
mkdir -p config
```

## 🎨 中级配置

### 使用私有镜像仓库

```bash
# 登录私有仓库
docker login my-registry.com

# 构建并标记镜像
docker build -t my-registry.com/docker-copilot-frontend:latest .

# 推送到私有仓库
docker push my-registry.com/docker-copilot-frontend:latest
```

### Nginx 反向代理配置

如果需要使用 Nginx 作为反向代理：

```nginx
upstream frontend {
    server docker-copilot-frontend:12713;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 使用 Docker 卷持久化数据

```bash
docker run -d \
  --name docker-copilot-frontend \
  -p 12713:12713 \
  -v docker-copilot-data:/app/data \
  docker-copilot-frontend:latest
```

## 📋 部署到不同平台

### 部署到 Docker Swarm

```bash
# 初始化 Swarm
docker swarm init

# 部署服务
docker stack deploy -c docker-compose.yml docker-copilot

# 查看服务状态
docker service ls

# 删除服务
docker stack rm docker-copilot
```

### 部署到 Kubernetes

```bash
# 创建 Kubernetes 部署文件（deployment.yaml）
kubectl apply -f deployment.yaml

# 查看部署状态
kubectl get deployments

# 查看 Pod
kubectl get pods

# 查看服务
kubectl get services

# 删除部署
kubectl delete deployment docker-copilot-frontend
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细错误日志
docker logs docker-copilot-frontend

# 进入容器排查
docker exec -it docker-copilot-frontend sh

# 检查端口是否被占用
docker ps | grep 12713
```

### 性能优化

```bash
# 查看容器资源使用
docker stats docker-copilot-frontend

# 限制容器资源
docker run -d \
  --memory 512m \
  --cpus 0.5 \
  -p 12713:12713 \
  docker-copilot-frontend:latest
```

## 📚 相关资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Dockerfile 最佳实践](https://docs.docker.com/develop/dockerfile_best-practices/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)

---

有问题？查看日志或进入容器进行调试！🚀
