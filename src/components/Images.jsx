import React, { useState, useEffect } from 'react'
import { HardDrive, Trash, Trash2, Calendar, RefreshCw, Link, BrushCleaning, List, Grid, X } from 'lucide-react'
import { imageAPI } from '../api/client.js'
import { cn } from '../utils/cn.js'
import { getImageLogo } from '../config/imageLogos.js'

// 安全的图片组件
function SafeImage({ src, alt, className, fallback }) {
  const [hasError, setHasError] = React.useState(false)
  
  if (hasError || !src) {
    return fallback
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={() => setHasError(true)}
    />
  )
}

export function Images() {
  const [images, setImages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImages, setSelectedImages] = useState([]) // 用于多选功能
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false) // 多选模式状态
  const [viewMode, setViewMode] = useState('list') // 视图模式: 'list' 或 'grid'
  const [pruneModal, setPruneModal] = useState({ 
    isOpen: false, 
    type: '', 
    images: [] 
  }) // 清理确认模态框状态
  
  // 自定义确认弹窗状态
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    type: 'info' // info, warning, danger
  })

  const fetchImages = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('开始获取镜像列表...')
      
      // 检查token
      const token = localStorage.getItem('docker_copilot_token')
      console.log('当前token:', token)
      
      if (!token) {
        setError('未找到认证令牌，请重新登录')
        setIsLoading(false)
        return
      }
      
      // 使用imageAPI调用正确的路径
      const response = await imageAPI.getImages()
      console.log('镜像API响应:', response)
      
      // 根据实际API响应调整状态码检查
      if (response.data && (response.data.code === 0 || response.data.code === 200)) {
        setImages(response.data.data || [])
        console.log('成功获取镜像列表:', response.data.data)
      } else {
        const errorMsg = response.data?.msg || '未知错误'
        console.error('获取镜像列表失败:', errorMsg)
        setError(errorMsg)
        setImages([])
      }
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.message || '网络错误，请检查后端服务'
      console.error('获取镜像列表失败:', errorMsg)
      console.error('错误详情:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        config: error.config
      })
      
      setError(errorMsg)
      
      // 特别处理401错误
      if (error.response?.status === 401) {
        console.error('认证失败，请重新登录')
        setError('认证已过期，请重新登录')
        // 不自动刷新页面，让用户看到错误信息
      }
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  const handleDeleteImage = async (imageId, force = false) => {
    try {
      // Check if this is the protected image (only protect when not force deleting)
      const imageToDelete = images.find(img => img.id === imageId);
      const protectedImage = '0nlylty/dockercopilot';
      
      if (!force && imageToDelete && imageToDelete.name.includes(protectedImage)) {
        // 使用自定义弹窗替换alert
        setConfirmModal({
          isOpen: true,
          title: '操作禁止',
          message: '无法删除受保护的系统镜像',
          onConfirm: () => setConfirmModal({ isOpen: false }),
          onCancel: null,
          type: 'info'
        });
        return;
      }

      // 使用自定义弹窗替换confirm
      setConfirmModal({
        isOpen: true,
        title: '确认删除',
        message: force 
          ? '确定要强制删除此镜像吗？这将删除正在使用的镜像！' 
          : '确定要删除此镜像吗？',
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          setIsLoading(true);
          
          try {
            await imageAPI.deleteImage(imageId, force);
            // 刷新镜像列表
            fetchImages();
          } catch (error) {
            console.error('删除镜像失败:', error);
            const errorMsg = error.response?.data?.msg || error.message || '删除镜像失败';
            setError(errorMsg);
            setIsLoading(false);
          }
        },
        onCancel: () => setConfirmModal({ isOpen: false }),
        type: force ? 'danger' : 'warning'
      });
    } catch (error) {
      console.error('删除镜像失败:', error);
      const errorMsg = error.response?.data?.msg || error.message || '删除镜像失败';
      setError(errorMsg);
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('docker_copilot_token')
    window.location.reload()
  }



  // 切换多选模式
  const toggleMultiSelectMode = () => {
    if (isMultiSelectMode) {
      // 退出多选模式时清空选择
      setSelectedImages([])
    }
    setIsMultiSelectMode(!isMultiSelectMode)
  }

  // 切换单个镜像的选中状态
  const toggleImageSelection = (imageId) => {
    if (selectedImages.includes(imageId)) {
      setSelectedImages(selectedImages.filter(id => id !== imageId))
    } else {
      setSelectedImages([...selectedImages, imageId])
    }
  }

  // 切换所有镜像的选中状态
  const toggleSelectAll = () => {
    if (selectedImages.length === images.length) {
      // 如果已经全选，则取消全选
      setSelectedImages([])
    } else {
      // 否则全选所有镜像
      setSelectedImages(images.map(img => img.id))
    }
  }

  // 批量删除镜像
  const handleBatchDelete = async (force = false) => {
    try {
      if (selectedImages.length === 0) return

      // Filter out protected images only when not force deleting
      const protectedImage = '0nlylty/dockercopilot';
      let filteredImages = selectedImages;
      
      if (!force) {
        filteredImages = selectedImages.filter(imageId => {
          const image = images.find(img => img.id === imageId);
          return image && !image.name.includes(protectedImage);
        });

        // If any images were filtered out, show a message
        if (filteredImages.length < selectedImages.length) {
          const protectedCount = selectedImages.length - filteredImages.length;
          // 使用自定义弹窗替换alert
          setConfirmModal({
            isOpen: true,
            title: '操作提示',
            message: `跳过了 ${protectedCount} 个受保护的系统镜像`,
            onConfirm: () => setConfirmModal({ isOpen: false }),
            onCancel: null,
            type: 'info'
          });
        }
      }

      if (filteredImages.length === 0) {
        return; // No images to delete
      }

      // 使用自定义弹窗替换confirm
      setConfirmModal({
        isOpen: true,
        title: '确认批量删除',
        message: force 
          ? `确定要强制删除选中的 ${filteredImages.length} 个镜像吗？这将删除正在使用的镜像！` 
          : `确定要删除选中的 ${filteredImages.length} 个镜像吗？`,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          setIsLoading(true);
          
          try {
            // 批量删除镜像
            const deletePromises = filteredImages.map(imageId => 
              imageAPI.deleteImage(imageId, force)
            );
            
            await Promise.all(deletePromises);
            
            // 清空选择并刷新列表
            setSelectedImages([]);
            setIsMultiSelectMode(false);
            fetchImages();
            
            // 显示成功消息
            console.log(`${filteredImages.length} 个镜像删除成功`);
          } catch (error) {
            console.error('批量删除镜像失败:', error);
            const errorMsg = error.response?.data?.msg || error.message || '批量删除镜像失败';
            setError(errorMsg);
            setIsLoading(false);
          }
        },
        onCancel: () => setConfirmModal({ isOpen: false }),
        type: force ? 'danger' : 'warning'
      });
    } catch (error) {
      console.error('批量删除镜像失败:', error);
      const errorMsg = error.response?.data?.msg || error.message || '批量删除镜像失败';
      setError(errorMsg);
      setIsLoading(false);
    }
  }

  // 显示清理确认模态框
  const showPruneConfirm = (type) => {
    let imagesToPrune = []
    
    if (type === 'dangling') {
      // 获取无tag的镜像 (still protect the image even when pruning)
      imagesToPrune = images.filter(img => (img.tag === 'None' || img.tag === '<none>') && !img.name.includes('0nlylty/dockercopilot'))
    } else if (type === 'unused') {
      // 获取未使用的镜像 (allow pruning of unused protected images)
      imagesToPrune = images.filter(img => !img.inUsed)
      // But still protect the specific protected image
      imagesToPrune = imagesToPrune.filter(img => !img.name.includes('0nlylty/dockercopilot'))
    }
    
    setPruneModal({
      isOpen: true,
      type,
      images: imagesToPrune
    })
  }

  // 执行清理操作
  const handlePruneImages = async (type) => {
    try {
      setIsLoading(true)
      setPruneModal({ isOpen: false, type: '', images: [] })
      
      // 使用现有的删除镜像API逐个删除镜像
      const deletePromises = pruneModal.images.map(image => 
        imageAPI.deleteImage(image.id)
      )
      
      await Promise.all(deletePromises)
      
      // 刷新镜像列表
      fetchImages()
      
      // 显示成功消息
      const message = type === 'dangling' 
        ? '无tag镜像清理完成' 
        : '未使用镜像清理完成'
      console.log(message)
    } catch (error) {
      console.error('清理镜像失败:', error)
      const errorMsg = error.response?.data?.msg || error.message || '清理镜像失败'
      setError(errorMsg)
      setIsLoading(false)
    }
  }

  const getSizeColor = (size) => {
    const sizeInMB = parseInt(size)
    if (sizeInMB < 100) return 'text-green-600 dark:text-green-400'
    if (sizeInMB < 300) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const formatImageSize = (sizeStr) => {
    if (!sizeStr) return '0 MB'
    
    // 将小写的"b"替换为大写的"B"
    return sizeStr.replace(/mb/gi, 'MB')
                  .replace(/gb/gi, 'GB')
                  .replace(/kb/gi, 'KB')
                  .replace(/b/g, 'B')
  }

  // 获取镜像使用状态指示器颜色
  const getUsageIndicatorColor = (inUsed) => {
    return inUsed ? 'bg-green-500' : 'bg-gray-400'
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 自定义确认弹窗 */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {confirmModal.title}
              </h3>
              <button 
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  setConfirmModal({ isOpen: false });
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 dark:text-gray-400">
                {confirmModal.message}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-end space-x-3">
              <button
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  setConfirmModal({ isOpen: false });
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                className={cn(
                  "btn-primary",
                  confirmModal.type === 'danger' && "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                )}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 清理确认模态框 */}
      {pruneModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {pruneModal.type === 'dangling' ? '清理无tag镜像' : '清理未使用镜像'}
              </h3>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-64">
              {pruneModal.images.length > 0 ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    确定要清理以下 {pruneModal.images.length} 个镜像吗？
                  </p>
                  <ul className="space-y-2">
                    {pruneModal.images.map((image) => (
                      <li key={image.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <SafeImage
                              src={getImageLogo(image.name)}
                              alt={image.name}
                              className="h-8 w-8 rounded-lg object-cover"
                              fallback={
                                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <HardDrive className="h-4 w-4 text-white" />
                                </div>
                              }
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {image.name}:{image.tag === 'None' || image.tag === '<none>' ? 'latest' : image.tag}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatImageSize(image.size)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  没有找到需要清理的镜像
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-end space-x-3">
              <button
                onClick={() => setPruneModal({ isOpen: false, type: '', images: [] })}
                className="btn-secondary"
                disabled={isLoading}
              >
                取消
              </button>
              {pruneModal.images.length > 0 && (
                <button
                  onClick={() => handlePruneImages(pruneModal.type)}
                  className="btn-primary bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  disabled={isLoading}
                >
                  确认清理
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">镜像管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理您的Docker镜像，包括查看、删除等操作
          </p>
        </div>
        <div className="flex space-x-3">
          {isMultiSelectMode ? (
            <>
              <button 
                onClick={toggleSelectAll}
                className="btn-secondary"
              >
                {selectedImages.length === images.length ? '取消全选' : '全选'}
              </button>
              <button 
                onClick={() => handleBatchDelete(false)}
                disabled={selectedImages.length === 0 || isLoading}
                className="btn-secondary"
              >
                <Trash className="h-4 w-4 mr-2" />
                删除 ({selectedImages.length})
              </button>
              <button 
                onClick={() => handleBatchDelete(true)}
                disabled={selectedImages.length === 0 || isLoading}
                className="btn-secondary text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                强制删除 ({selectedImages.length})
              </button>
              <button 
                onClick={toggleMultiSelectMode}
                className="btn-primary"
              >
                完成
              </button>
            </>
          ) : (
            <>
              <div className="flex">
                <button 
                  onClick={() => showPruneConfirm('dangling')}
                  className="btn-secondary rounded-l-lg rounded-r-none border-r border-gray-300 dark:border-gray-600"
                  title="清理没有tag的镜像"
                >
                  <BrushCleaning className="h-4 w-4" />
                  <span className="ml-2">无Tag</span>
                </button>
                <button 
                  onClick={() => showPruneConfirm('unused')}
                  className="btn-secondary rounded-r-lg rounded-l-none"
                  title="清理没有使用的镜像"
                >
                  <BrushCleaning className="h-4 w-4" />
                  <span className="ml-2">未使用</span>
                </button>
              </div>
              <button 
                onClick={toggleMultiSelectMode}
                className="btn-secondary"
              >
                批量操作
              </button>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-3 py-2 text-sm",
                    viewMode === 'list' 
                      ? "bg-primary-600 text-white" 
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                  title="列表视图"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-3 py-2 text-sm",
                    viewMode === 'grid' 
                      ? "bg-primary-600 text-white" 
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                  title="网格视图"
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
              <button 
                onClick={fetchImages}
                className="btn-primary"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-center text-red-800 dark:text-red-200">
            <span>获取镜像列表失败: {error}</span>
            <button 
              onClick={fetchImages}
              className="ml-4 px-3 py-1 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded text-sm"
            >
              重试
            </button>
            {(error.includes('认证') || error.includes('令牌')) && (
              <button 
                onClick={handleLogout}
                className="ml-2 px-3 py-1 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-700 text-white rounded text-sm"
              >
                重新登录
              </button>
            )}
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {images.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">总镜像数</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {images.filter(img => img.inUsed).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">使用中的镜像</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {images.filter(img => !img.inUsed).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">未使用的镜像</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {images.filter(img => img.tag === 'None' || img.tag === '<none>').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">无Tag镜像</div>
        </div>
      </div>

      {/* 镜像列表 */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {images.map((image) => (
            <div key={image.id} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {isMultiSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => toggleImageSelection(image.id)}
                      className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                  )}
                  <div className="flex-shrink-0">
                    <SafeImage
                      src={getImageLogo(image.name)}
                      alt={image.name}
                      className="h-10 w-10 rounded-lg object-cover"
                      fallback={
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <HardDrive className="h-6 w-6 text-white" />
                        </div>
                      }
                    />
                  </div>
                  
                  {/* 使用状态指示器竖线 - 放在图标和镜像名称中间 */}
                  <div className="flex flex-col items-center justify-center">
                    <div className={cn(
                      "w-1 h-10 rounded-full",
                      getUsageIndicatorColor(image.inUsed)
                    )}></div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {image.name}
                      </h3>
                      <span className="badge-info">{image.tag}</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className={cn("font-medium", getSizeColor(image.size))}>
                        大小: {formatImageSize(image.size)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>创建: {new Date(image.createTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <a
                    href={`https://hub.docker.com/r/${image.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="在Docker Hub上查看"
                    aria-label="在Docker Hub上查看"
                  >
                    <Link className="h-4 w-4 mr-1" />
                    跳转
                  </a>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除镜像"
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    删除
                  </button>
                  {image.inUsed && (
                    <button
                      onClick={() => handleDeleteImage(image.id, true)}
                      className="flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="强制删除镜像"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      强制删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 网格视图
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => (
            <div key={image.id} className="card p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                {isMultiSelectMode && (
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 mr-2"
                  />
                )}
                <div className="flex-shrink-0">
                  <SafeImage
                    src={getImageLogo(image.name)}
                    alt={image.name}
                    className="h-12 w-12 rounded-lg object-cover"
                    fallback={
                      <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <HardDrive className="h-6 w-6 text-white" />
                      </div>
                    }
                  />
                </div>
                <div className="flex items-center space-x-1 ml-auto">

                  <a
                    href={`https://hub.docker.com/r/${image.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="在Docker Hub上查看"
                    aria-label="在Docker Hub上查看"
                  >
                    <Link className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除镜像"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                  {image.inUsed && (
                    <button
                      onClick={() => handleDeleteImage(image.id, true)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="强制删除镜像"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1" title={image.name}>
                  {image.name}
                </h3>
                <div className="flex items-center mb-3">
                  <span className="badge-info text-xs">{image.tag}</span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <span className={cn("font-medium", getSizeColor(image.size))}>
                      {formatImageSize(image.size)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span className="truncate">{new Date(image.createTime).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className={cn(
                      "badge text-xs",
                      image.inUsed ? "badge-success" : "badge-warning"
                    )}>
                      {image.inUsed ? '使用中' : '未使用'}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      )}


    </div>
  )
}