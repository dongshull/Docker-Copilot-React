import React, { useState } from 'react'
import { 
  Play, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  Edit3, 
  Download,
  Upload,
  Trash2,
  MoreVertical,
  Clock,
  Calendar,
  Package,
  CheckCircle,
  AlertCircle,
  X,
  Info
} from 'lucide-react'
import { containerAPI } from '../api/client.js'
import { cn } from '../utils/cn.js'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getImageLogo } from '../config/imageLogos.js'

export function Containers() {
  const queryClient = useQueryClient()
  const [selectedContainer, setSelectedContainer] = useState(null)
  const [showActions, setShowActions] = useState(null)
  // 添加批量操作相关的状态
  const [selectedContainers, setSelectedContainers] = useState([])
  const [isBatchMode, setIsBatchMode] = useState(false)

  // 使用React Query获取容器列表
  const { data: containers = [], isLoading, refetch } = useQuery({
    queryKey: ['containers'],
    queryFn: async () => {
      const response = await containerAPI.getContainers()
      if (response.data.code === 0) {
        // 调试：打印容器数据结构
        console.log('容器数据:', response.data.data)
        if (response.data.data && response.data.data.length > 0) {
          console.log('第一个容器对象:', response.data.data[0])
          console.log('容器对象字段:', Object.keys(response.data.data[0]))
        }
        return response.data.data
      } else {
        throw new Error(response.data.msg)
      }
    },
    refetchInterval: 10000, // 每10秒自动刷新一次
  })

  const handleContainerAction = async (containerId, action) => {
    try {
      setShowActions(null)
      
      switch (action) {
        case 'start':
          await containerAPI.startContainer(containerId)
          break
        case 'stop':
          await containerAPI.stopContainer(containerId)
          break
        case 'restart':
          await containerAPI.restartContainer(containerId)
          break
        default:
          break
      }
      
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
    } catch (error) {
      console.error('操作失败:', error)
      if (error.response?.status === 401) {
        console.error('认证失败，请重新登录')
      }
    }
  }

  // 批量操作处理函数
  const handleBatchAction = async (action) => {
    try {
      // 对每个选中的容器执行操作
      for (const containerId of selectedContainers) {
        switch (action) {
          case 'start':
            await containerAPI.startContainer(containerId)
            break
          case 'stop':
            await containerAPI.stopContainer(containerId)
            break
          case 'restart':
            await containerAPI.restartContainer(containerId)
            break
          case 'update':
            // 这里需要实现更新逻辑，暂时留空
            // 为了简化，我们使用容器当前的镜像信息进行更新
            const container = containers.find(c => c.id === containerId)
            if (container) {
              await containerAPI.updateContainer(containerId, container.usingImage, container.name, true)
            }
            break
          default:
            break
        }
      }
      
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
      
      // 清除选中状态
      setSelectedContainers([])
      setIsBatchMode(false)
    } catch (error) {
      console.error('批量操作失败:', error)
    }
  }

  const handleRenameContainer = async (containerId, newName) => {
    try {
      await containerAPI.renameContainer(containerId, newName)
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
    } catch (error) {
      console.error('重命名容器失败:', error)
    }
  }

  const handleUpdateContainer = async (containerId, imageNameAndTag, containerName, delOldContainer) => {
    try {
      await containerAPI.updateContainer(containerId, imageNameAndTag, containerName, delOldContainer)
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
    } catch (error) {
      console.error('更新容器失败:', error)
    }
  }

  // 容器选择处理函数
  const toggleContainerSelection = (containerId) => {
    if (selectedContainers.includes(containerId)) {
      setSelectedContainers(selectedContainers.filter(id => id !== containerId))
    } else {
      setSelectedContainers([...selectedContainers, containerId])
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedContainers.length === containers.length) {
      setSelectedContainers([])
    } else {
      setSelectedContainers(containers.map(container => container.id))
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      running: { label: '运行中', className: 'badge-success' },
      stopped: { label: '已停止', className: 'badge-error' },
      restarting: { label: '重启中', className: 'badge-warning' },
      paused: { label: '已暂停', className: 'badge-info' }
    }
    
    const config = statusConfig[status] || { label: status, className: 'badge-info' }
    
    return (
      <span className={cn('badge', config.className)}>
        {config.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
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
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">容器管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理您的Docker容器，包括启动、停止、重启等操作
          </p>
        </div>
        
        {/* 批量操作按钮区域 */}
        {!isBatchMode ? (
          <div className="flex space-x-3">
            <button 
              className="btn-secondary"
              onClick={() => setIsBatchMode(true)}
            >
              批量操作
            </button>
            <button 
              className="btn-primary"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </button>
          </div>
        ) : (
          <div className="flex space-x-3">
            <button 
              className="btn-secondary"
              onClick={toggleSelectAll}
            >
              {selectedContainers.length === containers.length ? '取消全选' : '全选'}
            </button>
            <button 
              className={`btn-primary flex items-center ${selectedContainers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedContainers.length === 0}
              onClick={() => handleBatchAction('start')}
            >
              <Play className="h-4 w-4 mr-2" />
              启动
            </button>
            <button 
              className={`btn-secondary flex items-center ${selectedContainers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedContainers.length === 0}
              onClick={() => handleBatchAction('stop')}
            >
              <Square className="h-4 w-4 mr-2" />
              停止
            </button>
            <button 
              className={`btn-secondary flex items-center ${selectedContainers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedContainers.length === 0}
              onClick={() => handleBatchAction('restart')}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重启
            </button>
            <button 
              className={`btn-secondary flex items-center ${selectedContainers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedContainers.length === 0}
              onClick={() => handleBatchAction('update')}
            >
              <Upload className="h-4 w-4 mr-2" />
              更新
            </button>
            <button 
              className="btn-danger"
              onClick={() => {
                setSelectedContainers([])
                setIsBatchMode(false)
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* 容器列表 */}
      <div className="space-y-4">
        {containers.map((container) => (
          <div key={container.id} className="card p-6">
            <div className="flex items-center justify-between">
              {/* 容器选择和基本信息 */}
              <div className="flex items-center space-x-4">
                {isBatchMode && (
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedContainers.includes(container.id)}
                      onChange={() => toggleContainerSelection(container.id)}
                      className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </div>
                )}
                <div className="flex-shrink-0">
                  {(() => {
                    // 获取镜像logo数据
                    const imageLogos = JSON.parse(localStorage.getItem('docker_copilot_image_logos') || '{}');
                    // 查找匹配的镜像图标
                    let iconUrl = container.iconUrl;
                    
                    // 如果容器没有自定义图标，则查找镜像图标
                    if (!iconUrl && container.usingImage) {
                      // 首先尝试使用内置logo配置
                      const builtInLogo = getImageLogo(container.usingImage, imageLogos);
                      if (builtInLogo) {
                        iconUrl = builtInLogo;
                      } else {
                        // 如果没有内置logo，则使用原来的匹配逻辑
                        for (const [imageName, logoUrl] of Object.entries(imageLogos)) {
                          // 检查容器使用的镜像是否包含镜像名称
                          // 镜像名称格式可能是 "repository" 或 "repository:tag"
                          if (container.usingImage.startsWith(imageName) || 
                              container.usingImage.includes(`${imageName}:`)) {
                            iconUrl = logoUrl;
                            break;
                          }
                        }
                      }
                    }
                    
                    // 根据图标URL显示相应内容
                    if (iconUrl) {
                      return (
                        <img 
                          src={iconUrl} 
                          alt={container.name} 
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => {
                            // 如果图片加载失败，显示默认图标
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-white">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                </svg>
                              </div>
                            `;
                          }}
                        />
                      );
                    } else {
                      return (
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                      );
                    }
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 
                      className="text-lg font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                      onClick={() => setSelectedContainer(container)}
                    >
                      {container.name}
                    </h3>
                    {container.haveUpdate && (
                      <span className="badge-warning">可更新</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {container.usingImage}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>创建: {new Date(container.createTime).toLocaleDateString()}</span>
                    </div>
                    {container.status === 'running' && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>运行: {container.runningTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 容器操作按钮 */}
              <div className="flex items-center space-x-3">
                {getStatusBadge(container.status)}
                
                {/* 单个容器操作按钮（非批量模式下显示） */}
                {!isBatchMode && (
                  <div className="flex space-x-2">
                    {container.status === 'running' ? (
                      <>
                        <button
                          onClick={() => handleContainerAction(container.id, 'stop')}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="停止"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleContainerAction(container.id, 'restart')}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="重启"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleContainerAction(container.id, 'start')}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="启动"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleContainerAction(container.id, 'update')}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="更新"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => setSelectedContainer(container)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="详情"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {containers.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无容器</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            当前没有运行中的Docker容器
          </p>
        </div>
      )}
      
      {/* 容器详情弹窗 */}
      {selectedContainer && (
        <ContainerDetailModal 
          container={selectedContainer} 
          onClose={() => setSelectedContainer(null)}
          onRename={handleRenameContainer}
          onUpdate={handleUpdateContainer}
          onAction={handleContainerAction}
        />
      )}
    </div>
  )
}

// 容器详情弹窗组件
function ContainerDetailModal({ container, onClose, onRename, onUpdate, onAction }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(container.name)
  const [imageNameAndTag, setImageNameAndTag] = useState(container.usingImage)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  const [currentAction, setCurrentAction] = useState('')
  const [currentContainer, setCurrentContainer] = useState(container)

  // 当容器切换时，更新表单字段的值
  React.useEffect(() => {
    setName(container.name)
    setImageNameAndTag(container.usingImage)
    setCurrentContainer(container)
  }, [container])

  // 实时更新容器状态
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await containerAPI.getContainers();
        if (response.data.code === 0) {
          const containers = response.data.data;
          const updatedContainer = containers.find(c => c.id === container.id);
          if (updatedContainer) {
            // 检查是否有镜像图标
            const imageLogos = JSON.parse(localStorage.getItem('docker_copilot_image_logos') || '{}');
            // 查找匹配的镜像图标
            let matchedImageKey = null;
            
            // 如果容器没有自定义图标，则查找镜像图标
            if (!updatedContainer.iconUrl) {
              // 使用完整的镜像名称和标签进行匹配
              const imageFullName = updatedContainer.usingImage;
              
              // 首先尝试精确匹配（包含tag）
              if (imageLogos[imageFullName]) {
                updatedContainer.iconUrl = imageLogos[imageFullName];
              } else {
                // 如果精确匹配失败，尝试镜像名称匹配（不包含tag部分）
                const imageName = updatedContainer.usingImage.split(':')[0];
                
                // 遍历所有镜像图标，查找匹配的镜像名称
                for (const [imageId, logoUrl] of Object.entries(imageLogos)) {
                  // 检查镜像名称是否匹配（不包含tag部分）
                  const logoImageName = imageId.split(':')[0];
                  if (imageName === logoImageName) {
                    updatedContainer.iconUrl = logoUrl;
                    break;
                  }
                }
              }
            }
            
            setCurrentContainer(updatedContainer);
          }
        }
      } catch (error) {
        console.error('获取容器状态失败:', error);
      }
    }, 3000); // 每3秒获取一次最新状态

    return () => clearInterval(interval);
  }, [container.id]);

  const handleContainerAction = async (action) => {
    try {
      setIsActionProcessing(true);
      setCurrentAction(action);
      
      // 调用传入的onAction函数执行实际操作
      await onAction(container.id, action);
      
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
      
      setIsActionProcessing(false);
      setCurrentAction('');
    } catch (error) {
      console.error('操作失败:', error);
      setIsActionProcessing(false);
      setCurrentAction('');
    }
  };

  const handleRename = async () => {
    if (name !== container.name) {
      setIsRenaming(true)
      await onRename(container.id, name)
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
      setIsRenaming(false)
    }
  }

  const handleSave = async () => {
    // 如果镜像tag发生变化，则更新容器
    if (imageNameAndTag !== container.usingImage) {
      setIsUpdating(true)
      // 使用当前容器名称作为新容器名称
      await onUpdate(container.id, imageNameAndTag, container.name, /* delOldContainer */ false)
      // 无效化查询以触发重新获取数据
      await queryClient.invalidateQueries(['containers'])
      setIsUpdating(false)
    }
  }

  // 保存图标URL
  const saveIconUrl = async () => {
    try {
      setIsUpdating(true)
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 创建更新后的容器对象
      const updatedContainerData = { ...container, iconUrl: iconUrl }
      
      // 更新当前容器状态
      setCurrentContainer(updatedContainerData)
      
      // 更新父组件中的容器列表状态
      // 注意：实际项目中这里应该调用API保存到服务器
      // 我们通过更新React Query缓存来模拟保存效果
      const containersQueryData = queryClient.getQueryData(['containers'])
      if (containersQueryData) {
        const updatedContainers = containersQueryData.map(c => 
          c.id === container.id ? updatedContainerData : c
        )
        queryClient.setQueryData(['containers'], updatedContainers)
      }
      
      setIsUpdating(false)
    } catch (error) {
      console.error('保存图标URL失败:', error)
      setIsUpdating(false)
    }
  }

  // 获取状态徽章组件
  const getStatusBadge = (status) => {
    const statusConfig = {
      running: { label: '运行中', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      stopped: { label: '已停止', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      restarting: { label: '重启中', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      paused: { label: '已暂停', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
    }
    
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  // 获取容器图标
  const getContainerIcon = () => {
    // 检查是否有自定义图标
    if (currentContainer.iconUrl) {
      return (
        <img 
          src={currentContainer.iconUrl} 
          alt={currentContainer.name} 
          className="h-10 w-10 rounded-lg object-cover"
          onError={(e) => {
            // 如果图片加载失败，显示默认图标
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.insertAdjacentHTML('afterend', `
              <div class="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package class="h-6 w-6 text-white" />
              </div>
            `);
          }}
        />
      );
    }
    
    // 查找匹配的镜像图标
    const imageLogos = JSON.parse(localStorage.getItem('docker_copilot_image_logos') || '{}');
    if (imageLogos && typeof imageLogos === 'object' && currentContainer.usingImage) {
      // 使用完整的镜像名称和标签进行匹配
      const imageFullName = currentContainer.usingImage;
      
      // 首先尝试精确匹配（包含tag）
      if (imageLogos[imageFullName]) {
        return (
          <img 
            src={imageLogos[imageFullName]} 
            alt={currentContainer.name} 
            className="h-10 w-10 rounded-lg object-cover"
            onError={(e) => {
              // 如果图片加载失败，回退到默认图标
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.insertAdjacentHTML('afterend', `
                <div class="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Package class="h-6 w-6 text-white" />
                </div>
              `);
            }}
          />
        );
      } else {
        // 如果精确匹配失败，尝试镜像名称匹配（不包含tag部分）
        const imageName = currentContainer.usingImage.split(':')[0];
        
        // 遍历所有镜像图标，查找匹配的镜像名称
        for (const [imageId, logoUrl] of Object.entries(imageLogos)) {
          // 检查镜像名称是否匹配（不包含tag部分）
          const logoImageName = imageId.split(':')[0];
          if (imageName === logoImageName) {
            return (
              <img 
                src={logoUrl} 
                alt={currentContainer.name} 
                className="h-10 w-10 rounded-lg object-cover"
                onError={(e) => {
                  // 如果图片加载失败，回退到默认图标
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.insertAdjacentHTML('afterend', `
                    <div class="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Package class="h-6 w-6 text-white" />
                    </div>
                  `);
                }}
              />
            );
          }
        }
      }
    }
    
    // 默认图标
    return (
      <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
        <Package className="h-6 w-6 text-white" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* 弹窗头部 */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">容器详情</h3>
              <div className="flex items-center mt-1">
                {getContainerIcon()}
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentContainer.name}
                  </span>
                  <div className="flex items-center mt-1">
                    {getStatusBadge(currentContainer.status)}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {currentContainer.id.substring(0, 12)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* 弹窗内容 */}
        <div className="px-6 py-4 space-y-5">
          {/* 容器操作按钮 */}
          <div className="flex space-x-3">
            {currentContainer.status === 'running' ? (
              <>
                <button 
                  onClick={() => handleContainerAction('stop')}
                  disabled={isActionProcessing || isUpdating}
                  className={`flex-1 py-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                    isActionProcessing && currentAction === 'stop'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                  }`}
                >
                  {isActionProcessing && currentAction === 'stop' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      停止中
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      停止
                    </>
                  )}
                </button>
                <button 
                  onClick={() => handleContainerAction('restart')}
                  disabled={isActionProcessing || isUpdating}
                  className={`flex-1 py-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                    isActionProcessing && currentAction === 'restart'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-500 dark:hover:bg-yellow-600'
                  }`}
                >
                  {isActionProcessing && currentAction === 'restart' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      重启中
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      重启
                    </>
                  )}
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleContainerAction('start')}
                disabled={isActionProcessing || isUpdating}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                  isActionProcessing && currentAction === 'start'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                }`}
              >
                {isActionProcessing && currentAction === 'start' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    启动中
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    启动
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* 容器名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              容器名称
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input flex-1"
                placeholder="输入容器名称"
              />
              <button
                onClick={handleRename}
                disabled={isRenaming || name === container.name || isActionProcessing || isUpdating}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  isRenaming || name === container.name
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
                }`}
              >
                {isRenaming ? '...' : '重命名'}
              </button>
            </div>
          </div>
          
          {/* 镜像信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              镜像名称和标签
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={imageNameAndTag}
                onChange={(e) => setImageNameAndTag(e.target.value)}
                className="input flex-1"
                placeholder="例如: nginx:latest"
                disabled={isActionProcessing || isUpdating}
              />
              <button
                onClick={handleSave}
                disabled={isUpdating || imageNameAndTag === container.usingImage}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  isUpdating || imageNameAndTag === container.usingImage
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
                }`}
              >
                {isUpdating ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
          
        </div>
        
        {/* 弹窗底部 */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              disabled={isActionProcessing || isUpdating}
              className="btn-secondary px-4 py-2"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}