# 构建阶段 - Build Stage
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建应用
RUN npm run build

# ============================================
# 运行阶段 - Production Stage
FROM node:18-alpine

# 安装轻量级HTTP服务器
RUN npm install -g serve

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 12713

# 创建配置目录卷挂载点
VOLUME ["/app/dist/config"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:12713/ || exit 1

# 启动应用
CMD ["serve", "-s", "dist", "-l", "12713"]
