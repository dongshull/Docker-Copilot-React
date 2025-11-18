#!/bin/sh

# 统一的前端配置和启动脚本
# 用途1 (Docker): docker-config.sh               -> 容器启动时运行
# 用途2 (本地): ./docker-config.sh http://... ./dist -> 手动配置 dist

set -e

# 解析参数
if [ $# -eq 0 ]; then
  # Docker 容器内运行模式
  API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:12712}"
  DIST_DIR="/app/dist"
  PORT="${PORT:-12713}"
  START_SERVER=true
  CONFIG_DIR="/app/src/config"
  IMAGE_CONFIG_DIR="/app/dist/src/config"
else
  # 本地配置模式
  API_BASE_URL="${1}"
  DIST_DIR="${2:-.}/dist"
  PORT="${3:-12713}"
  START_SERVER=false
  CONFIG_DIR="./src/config"
  IMAGE_CONFIG_DIR="./dist/src/config"
fi

echo "================================================"
echo "Frontend Configuration & Startup"
echo "================================================"
echo "API Base URL: $API_BASE_URL"
echo "Distribution: $DIST_DIR"
echo "Server Port:  $PORT"
echo "Config Dir:   $CONFIG_DIR"
echo "Image Config: $IMAGE_CONFIG_DIR"
echo "================================================"

# 检查 dist 目录
if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Error: $DIST_DIR not found"
  ls -la "$(dirname "$DIST_DIR")" 2>/dev/null || echo "Parent directory not accessible"
  exit 1
fi

# 检查 index.html
if [ ! -f "${DIST_DIR}/index.html" ]; then
  echo "❌ Error: ${DIST_DIR}/index.html not found"
  echo "Files in dist:"
  ls -la "$DIST_DIR"
  exit 1
fi

# 初始化配置目录
init_config_dir() {
  local host_config_dir="$1"
  local image_config_dir="$2"
  
  # 检查宿主机挂载的目录是否存在
  if [ ! -d "$host_config_dir" ]; then
    echo "⚠ Warning: Host config directory $host_config_dir not found"
    return 0
  fi
  
  # 检查宿主机目录是否为空
  if [ -z "$(ls -A "$host_config_dir")" ]; then
    echo "✓ Host config directory is empty, initializing with image config files..."
    
    # 检查镜像配置目录是否存在且不为空
    if [ -d "$image_config_dir" ] && [ -n "$(ls -A "$image_config_dir")" ]; then
      echo "  Copying config files from image to host directory..."
      # 复制到宿主机挂载的目录
      cp -r "$image_config_dir"/* "$host_config_dir"/ 2>/dev/null || echo "  No files to copy or copy failed"
      echo "✓ Config files copied successfully"
    else
      echo "⚠ Warning: Image config directory $image_config_dir not found or is empty"
    fi
  else
    echo "✓ Host config directory already contains files, skipping initialization"
  fi
}

# 在 Docker 模式下初始化配置目录
if [ "$START_SERVER" = "true" ]; then
  # 检查是否挂载了宿主机目录（通过检查目录是否可写）
  if [ -w "/app/src" ]; then
    init_config_dir "/app/src/config" "/app/dist/src/config"
  fi
fi

# 检查配置目录
if [ ! -d "$CONFIG_DIR" ]; then
  echo "⚠ Warning: Config directory $CONFIG_DIR not found"
fi

# 检查配置目录中的图片目录
if [ -d "$CONFIG_DIR" ] && [ ! -d "$CONFIG_DIR/image" ]; then
  echo "⚠ Warning: Image directory $CONFIG_DIR/image not found"
fi

# 在 index.html 中注入 API 配置
echo "Injecting API configuration..."

TEMP_FILE="${DIST_DIR}/index.html.tmp"

awk -v api_url="$API_BASE_URL" '
  BEGIN { injected = 0 }
  /<head>/ && injected == 0 {
    print $0
    print "<script>"
    print "  window.__API_BASE_URL = '"'"'" api_url "'"'"';"
    print "  console.log('"'"'API configured:'"'"', window.__API_BASE_URL);"
    print "</script>"
    injected = 1
    next
  }
  { print }
' "${DIST_DIR}/index.html" > "$TEMP_FILE"

if [ $? -eq 0 ]; then
  mv "$TEMP_FILE" "${DIST_DIR}/index.html"
  echo "✓ Configuration injected successfully"
else
  echo "⚠ Warning: Failed to inject configuration"
  rm -f "$TEMP_FILE"
  exit 1
fi

# 验证注入
if grep -q "window.__API_BASE_URL" "${DIST_DIR}/index.html"; then
  echo "✓ Injection verified"
else
  echo "⚠ Warning: Could not verify injection"
fi

echo ""

# 如果是本地运行模式，不启动服务器
if [ "$START_SERVER" = "false" ]; then
  echo "✓ Configuration completed. Run your server with:"
  echo "  npx serve -s $DIST_DIR -l $PORT"
  exit 0
fi

# Docker 模式：启动服务器
echo "Starting server on http://0.0.0.0:${PORT}..."
echo "================================================"
echo ""

exec serve -s "$(basename "$DIST_DIR")" -l "$PORT"