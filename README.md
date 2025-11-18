# 🐳 Docker Copilot

> **您的Docker容器智能助手** - 一个简洁、优雅、强大的容器管理平台

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)

## ✨ 为什么选择 Docker Copilot？

在容器化时代，开发者们需要一个**直观、高效、令人愉悦**的容器管理工具。Docker Copilot 正是为此而生：

- 🎯 **极简的操作流程** - 复杂的Docker命令，简化为点击和拖拽
- 👁️ **实时数据可视化** - 容器状态、镜像信息一目了然，支持列表和网格两种视图
- 🚀 **智能批量操作** - 同时管理多个容器，提高工作效率
- 🔄 **后台进度追踪** - 更新、备份等操作实时显示进度，不打断工作流
- 🎨 **深色模式护眼** - 适配系统主题，自动切换亮暗界面
- 📱 **移动友好设计** - 从桌面到平板，完美适配各种屏幕尺寸
- 🔒 **安全认证机制** - JWT令牌加密传输，保护您的Docker环境

## 🎬 快速开始

### 前置要求

- Node.js 16+ 💻
- npm 或 yarn 📦
- 运行中的 Docker Copilot 后端服务 🐳

### 三步启动

```bash
# 1️⃣ 克隆项目
git clone <repository-url>
cd Docker-Copilot-React

# 2️⃣ 安装依赖
npm install

# 3️⃣ 启动开发服务器
npm run dev
```

访问 **http://localhost:12713** - 开始您的Docker之旅 🚀

## 📋 核心功能

### 🐳 容器管理
- **实时列表** - 查看所有容器状态，支持搜索和筛选
- **快速操作** - 一键启动、停止、重启容器
- **智能更新** - 自动拉取最新镜像，更新容器配置
- **批量处理** - 同时操作多个容器，支持全选/反选
- **详细信息** - 查看容器日志、配置、网络信息等

### 🖼️ 镜像管理  
- **镜像库** - 查看本地所有镜像及其大小
- **使用状态** - 清晰显示镜像被容器使用情况
- **快速删除** - 支持普通删除和强制删除
- **Docker Hub链接** - 直接跳转到官方镜像仓库

### 💾 备份恢复
- **一键备份** - 备份容器配置和数据
- **版本管理** - 保留多个备份版本，方便回滚
- **快速恢复** - 一键恢复到任意备份点
- **Compose导出** - 将备份导出为Docker Compose文件

### 🎨 图标管理
- **自定义图标** - 为容器和镜像添加个性化图标
- **预设库** - 包含常见应用的精美图标
- **本地存储** - 图标配置自动保存，无需担心丢失

### 📊 监控面板
- **实时状态** - 容器运行状态、资源占用一览无余
- **进度指示** - 长时间操作实时显示进度条
- **版本管理** - 前端后端版本号，一键检测更新

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| **React** | 18.2 | UI框架，构建交互式界面 |
| **Vite** | 5.0 | 极速构建工具，开发体验顶级 |
| **Tailwind CSS** | 3.3 | 原子化CSS框架，快速构建样式 |
| **React Query** | 5.8 | 服务端状态管理，智能缓存 |
| **Axios** | 1.6 | HTTP客户端，简洁的API请求 |
| **Lucide React** | 0.553 | 精美图标库，超过450个图标 |

## 📁 项目结构

```
Docker-Copilot-React/
├── 📦 src/
│   ├── 🧩 components/           # 核心组件
│   │   ├── Auth.jsx            # 认证登录界面
│   │   ├── Header.jsx          # 侧边栏导航
│   │   ├── Containers.jsx      # 容器管理页面 ⭐
│   │   ├── Images.jsx          # 镜像管理页面 ⭐
│   │   ├── Backups.jsx         # 备份恢复页面
│   │   ├── Icons.jsx           # 图标管理页面
│   │   └── ThemeToggle.jsx     # 主题切换器
│   ├── 🎣 hooks/                # 自定义Hooks
│   │   ├── useTheme.jsx        # 主题管理逻辑
│   │   └── useProgress.js      # 进度追踪逻辑
│   ├── 🔌 api/                  # API通信
│   │   └── client.js           # Axios配置和API方法
│   ├── 🛠️ utils/                # 工具函数
│   │   └── cn.js               # CSS类名合并工具
│   ├── 🎨 config/               # 配置文件
│   │   └── imageLogos.js       # 镜像图标配置
│   ├── 📚 assets/               # 静态资源
│   │   └── logo.js             # Logo配置
│   ├── App.jsx                 # 主应用组件
│   ├── main.jsx                # 应用入口
│   └── index.css               # 全局样式
├── 📄 package.json             # 项目配置
├── ⚙️ vite.config.js            # Vite配置
├── 🎨 tailwind.config.js        # Tailwind配置
└── 📝 README.md                # 项目说明
```

## 🌐 主题系统

Docker Copilot 内置完整的主题管理系统：

### 三种模式
- **☀️ 浅色模式** - 明亮舒适，适合白天工作
- **🌙 深色模式** - 护眼舒适，适合夜晚编码
- **🔄 跟随系统** - 自动适配系统设置

### 智能持久化
- 主题设置自动保存到浏览器本地存储
- 下次访问时自动恢复用户偏好
- 无需重复设置，开箱即用

## 🚀 构建和部署

### 开发构建
```bash
npm run dev    # 启动开发服务器，支持热更新
```

### 生产构建
```bash
npm run build  # 优化编译，生成dist目录
npm run preview # 本地预览生产版本
```

### 部署步骤

#### 1. 构建项目
```bash
npm run build
```

#### 2. 配置后端地址
编辑 `src/api/client.js`，修改 API 基础地址：
```javascript
const apiClient = axios.create({
  baseURL: 'http://your-backend-server:port'
})
```

#### 3. 部署到Web服务器
将 `dist` 目录部署到您的Web服务器：
- **Nginx** - 配置反向代理和静态文件服务
- **Apache** - 配置虚拟主机和URL重写
- **云平台** - 部署到Vercel、Netlify等平台

#### 4. 配置CORS（如需跨域）
确保后端服务允许来自前端的跨域请求

## 💻 浏览器支持

| 浏览器 | 最低版本 | 状态 |
|--------|---------|------|
| Chrome | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

<div align="center">

**用Docker Copilot，让容器管理变得简单而优雅** 🚀

Made with ❤️ for Docker lovers

</div>