# 构建阶段 - Build Stage
FROM node:18-alpine AS builder

# 接收构建参数
ARG VITE_API_BASE_URL=http://127.0.0.1:12712
ARG VITE_PORT=12713

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建应用 - 将构建参数传递给 Vite
RUN VITE_API_BASE_URL=${VITE_API_BASE_URL} VITE_PORT=${VITE_PORT} npm run build

# ============================================
# 运行阶段 - Production Stage
FROM node:18-alpine

# 安装轻量级HTTP服务器和必要工具
RUN npm install -g serve && apk add --no-cache bash

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist

# 复制配置脚本
COPY docker-config.sh /app/docker-config.sh
RUN chmod +x /app/docker-config.sh

# 暴露端口
EXPOSE 12713

# 创建配置目录卷挂载点
VOLUME ["/app/dist/config"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:12713/ || exit 1

# 使用配置脚本启动应用
CMD ["/app/docker-config.sh"]
