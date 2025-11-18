#!/bin/bash

# Docker 容器启动时的配置脚本
# 将环境变量注入到前端 HTML 中

# 默认 API 地址
API_BASE_URL=${VITE_API_BASE_URL:-"http://backend:12712"}

# 输出配置到 index.html 之前
CONFIG_SCRIPT="<script>
window.__API_BASE_URL = '${API_BASE_URL}';
console.log('API Base URL configured as:', window.__API_BASE_URL);
</script>"

# 如果 index.html 存在，在 <head> 中注入配置
if [ -f "/app/dist/index.html" ]; then
  sed -i "/<head>/a ${CONFIG_SCRIPT}" /app/dist/index.html
  echo "Configuration injected successfully"
else
  echo "Warning: index.html not found"
fi

# 启动服务
exec serve -s dist -l 12713
