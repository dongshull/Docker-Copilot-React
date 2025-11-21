// 内置常用镜像logo配置
// 格式: { "镜像名称": "logo URL" }
// 格式: { "镜像名称": "logo 地址" }
// 格式: { "镜像名称": "logo  Base64" }
// 支持镜像名称匹配，如 "nginx" 会匹配 "nginx:latest", "nginx:alpine" 等

export const builtInImageLogos = {
  "xylplm/media-saber": "https://icon.xiaoge.org/images/docker/MediaSaber.png",
  "jxxghp/moviepilot-v2": "https://raw.dongshu.fun:99/dc/146.png",
  "0nlylty/dockercopilot": "https://icon.xiaoge.org/images/docker/DockerCopilot-3.png",
  "mtphotos/mt-photos": "https://icon.xiaoge.org/images/docker/MT-Photos.png",
  "kqstone/mt-photos-insightface-unofficial": "https://icon.xiaoge.org/images/docker/MT-Photos.png",
  "mtphotos/mt-photos-ai": "https://icon.xiaoge.org/images/docker/MT-Photos.png",
  "corentinth/it-tools": "https://raw.dongshu.fun:99/dc/IT-Tools_w7z24.webp",
  "xream/sub-store": "https://raw.dongshu.fun:99/dc/Sub-Store.webp",
  "nyanmisaka/jellyfin": "https://raw.dongshu.fun:99/dc/132.png",
  "redis": "https://raw.dongshu.fun:99/dc/165.png",
  "postgres": "https://raw.dongshu.fun:99/dc/159.png",
  "hslr/sun-panel": "https://raw.dongshu.fun:99/dc/175.png",
  "whyour/qinglong": "https://qn.whyour.cn/favicon.svg",
  "linuxserver/transmission": "https://raw.dongshu.fun:99/dc/189.png",
  "linuxserver/qbittorrent": "https://raw.dongshu.fun:99/dc/QBittorrent_Q41Q0.webp",
  "imgzcq/fndesk": "https://raw.dongshu.fun:99/dc/718.png",
  "qiaokes/fntv-record-view": "https://raw.dongshu.fun:99/dc/718.png",
  "easychen/cookiecloud": "https://raw.dongshu.fun:99/dc/100.png",
  "codercom/code-server": "https://icon.xiaoge.org/images/website/vscode.png",
  "iyuucn/iyuuplus": "https://icon.xiaoge.org/images/docker/IYUU.png",
  "iyuucn/iyuuplus-dev-nodb": "https://icon.xiaoge.org/images/docker/IYUU.png",
  "gdy666/lucky": "https://raw.dongshu.fun:99/dc/4.png",
  "amilys/embyserver":"https://cdn.statically.io/img/laji.o--o.xyz/i/2025/11/21/204626.png"  
};

// 获取镜像的logo URL
// 优先级: 内置logo > 用户自定义 > 默认图标
export const getImageLogo = (imageName, customLogos = {}) => {
  // 先检查内置logo（优先级最高）
  const baseImageName = imageName.split(':')[0]; // 去掉tag部分
  if (builtInImageLogos[baseImageName]) {
    return builtInImageLogos[baseImageName];
  }
  
  // 再检查用户自定义的logo
  if (customLogos[imageName]) {
    return customLogos[imageName];
  }
  
  // 没有找到logo，返回null
  return null;
};

// 获取所有支持的镜像名称列表
export const getSupportedImageNames = () => {
  return Object.keys(builtInImageLogos);
};

// 检查镜像是否有内置logo
export const hasBuiltInLogo = (imageName) => {
  const baseImageName = imageName.split(':')[0];
  return builtInImageLogos[baseImageName] !== undefined;
};

// srchttps://raw.dongshu.fun:99/dc 文件夹中的可用图片文件列表
export const availableImageFiles = [
  "100.png", "132.png", "146.png", "159.png", "165.png", "17.png", 
  "175.png", "189.png", "4.png", "718.png", "IT-Tools_w7z24.webp", 
  "QBittorrent_Q41Q0.webp", "Sub-Store.webp"
];

// 快速映射函数：将图片文件名映射到完整的URL路径
export const mapImageFile = (fileName) => {
  return `https://raw.dongshu.fun:99/dc/${fileName}`;
};

// 批量映射函数：通过图片文件名快速创建镜像logo映射
export const createImageMapping = (mappings) => {
  const result = {};
  for (const [imageName, fileName] of Object.entries(mappings)) {
    result[imageName] = mapImageFile(fileName);
  }
  return result;
};

// 添加或更新镜像logo配置的便捷函数
export const addImageLogo = (imageName, fileName) => {
  const logoUrl = mapImageFile(fileName);
  builtInImageLogos[imageName] = logoUrl;
  return logoUrl;
};

// 批量添加镜像logo配置
export const addMultipleImageLogos = (mappings) => {
  const newMappings = createImageMapping(mappings);
  Object.assign(builtInImageLogos, newMappings);
  return newMappings;
};

// 获取所有可用的图片文件URL列表
export const getAvailableImageUrls = () => {
  return availableImageFiles.map(fileName => mapImageFile(fileName));
};

// 根据部分文件名搜索可用的图片文件
export const searchImageFiles = (searchTerm) => {
  return availableImageFiles.filter(fileName => 
    fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );
};