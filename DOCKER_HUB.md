# Docker Hub 推送配置指南

本项目支持自动推送 Docker 镜像到 Docker Hub。

## 📋 前置条件

1. **Docker Hub 账户**：需要有 Docker Hub 的账户
2. **访问令牌**：在 Docker Hub 中生成一个访问令牌
3. **GitHub Secrets**：配置 GitHub 仓库的 secrets

## 🔑 配置 GitHub Secrets

### 1. 生成 Docker Hub 访问令牌

1. 登录 [Docker Hub](https://hub.docker.com)
2. 点击右上角头像 → **Account Settings**
3. 左侧菜单选择 **Security** → **Access Tokens**
4. 点击 **Create access token**
5. 设置名称（如 `github-actions`）并生成
6. 复制生成的 token（只会显示一次）

### 2. 配置 GitHub Secrets

1. 打开你的 GitHub 仓库
2. **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下两个 secrets：

| Secret 名称 | 值 |
|------------|-----|
| `DOCKER_HUB_USERNAME` | 你的 Docker Hub 用户名 |
| `DOCKER_HUB_TOKEN` | 从上面生成的访问令牌 |

## 🚀 工作流说明

### 触发条件

工作流 `docker-hub.yml` 在以下情况下触发：

- ✅ 推送代码到 `master`、`main` 或 `dev` 分支
- ✅ 修改以下文件之一：
  - `src/**`（源代码）
  - `package.json`、`package-lock.json`（依赖）
  - `Dockerfile`（镜像配置）
  - `.github/workflows/docker-hub.yml`（工作流本身）
- ✅ 手动触发（在 **Actions** 标签页）

### 镜像标签

自动生成的镜像标签包括：

| 分支 | 标签 |
|------|------|
| `master` | `latest`、`<version>`、`<major>.<minor>`、`<commit-sha>` |
| `main` | `latest`、`<version>`、`<major>.<minor>`、`<commit-sha>` |
| `dev` | `dev`、`<commit-sha>` |

### 镜像地址

构建完成后，镜像会推送到：

```
docker.io/YOUR_DOCKER_HUB_USERNAME/docker-copilot-frontend:TAG
```

例如：
- `docker.io/dongshull/docker-copilot-frontend:latest`
- `docker.io/dongshull/docker-copilot-frontend:dev`
- `docker.io/dongshull/docker-copilot-frontend:1.0.0`

## 📦 使用镜像

配置完成后，可以直接从 Docker Hub 拉取镜像：

```bash
# 拉取最新版本
docker pull YOUR_DOCKER_HUB_USERNAME/docker-copilot-frontend:latest

# 拉取开发版本
docker pull YOUR_DOCKER_HUB_USERNAME/docker-copilot-frontend:dev

# 运行容器
docker run -d \
  --name docker-copilot-frontend \
  -p 12713:12713 \
  YOUR_DOCKER_HUB_USERNAME/docker-copilot-frontend:latest
```

## 🔧 多平台支持

工作流配置了支持多个平台：

- `linux/amd64`：x86_64 架构（Intel/AMD 处理器）
- `linux/arm64`：ARM64 架构（Apple Silicon M1/M2、ARM 服务器）

Docker Buildx 会自动为这两个平台构建镜像。

## 📊 构建缓存

工作流使用 GitHub Actions 缓存来加速构建：

- **缓存来源**：`type=gha`
- **缓存输出**：`type=gha,mode=max`

这样可以显著加快后续的构建速度。

## ✅ 验证推送

### 在 GitHub Actions 中查看

1. 打开仓库的 **Actions** 标签页
2. 找到 **Build and Push to Docker Hub** 工作流
3. 点击最新的运行记录
4. 查看 **Build and push to Docker Hub** 步骤的日志

### 在 Docker Hub 中查看

1. 登录 [Docker Hub](https://hub.docker.com)
2. 进入你的仓库 → **docker-copilot-frontend**
3. 在 **Tags** 标签页可以看到所有已推送的镜像

## 🐛 故障排除

### 推送失败 - 认证错误

**错误信息**：`Unauthorized: authentication required`

**解决方案**：
1. 检查 `DOCKER_HUB_USERNAME` 和 `DOCKER_HUB_TOKEN` 是否正确
2. 确保访问令牌还未过期
3. 尝试重新生成令牌并更新 GitHub Secrets

### 推送失败 - 权限不足

**错误信息**：`no permission to create repository`

**解决方案**：
1. 确保你的 Docker Hub 账户有创建仓库的权限
2. 检查是否达到了账户的仓库数量限制

### 镜像未出现在 Docker Hub

1. 检查 GitHub Actions 工作流是否成功运行
2. 查看工作流的日志，寻找推送步骤的错误信息
3. 确认仓库的可见性（公开/私有）

## 📚 相关文件

- `.github/workflows/docker-hub.yml` - Docker Hub 推送工作流
- `.github/workflows/build-and-push.yml` - GitHub Container Registry 推送工作流
- `Dockerfile` - Docker 镜像定义
- `.dockerignore` - Docker 构建忽略文件

## 🔗 有用的链接

- [Docker Hub 官网](https://hub.docker.com)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Docker Metadata Action](https://github.com/docker/metadata-action)
