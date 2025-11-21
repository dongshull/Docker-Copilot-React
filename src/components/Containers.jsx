import React, { useState } from 'react'
import { 
  Play, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  Upload,
  Clock,
  Calendar,
  Package,
  X,
  Info
} from 'lucide-react'
import { containerAPI, progressAPI } from '../api/client.js'
import { cn } from '../utils/cn.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getImageLogo } from '../config/imageLogos.js'

export function Containers() {
  const queryClient = useQueryClient()
  const [selectedContainer, setSelectedContainer] = useState(null)
  // 添加批量操作相关的状态
  const [selectedContainers, setSelectedContainers] = useState([])
  const [isBatchMode, setIsBatchMode] = useState(false)
  // 添加操作状态跟踪
  const [containerActions, setContainerActions] = useState({}) // 跟踪每个容器的操作状态
  const [updateTasks, setUpdateTasks] = useState({}) // 跟踪更新任务

  // 自定义确认弹窗状态
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    type: 'info' // info, warning, danger
  })



  // 使用React Query获取容器列表
  const { data: containers = [], isLoading, refetch } = useQuery({
    queryKey: ['containers'],
    queryFn: async () => {
      const response = await containerAPI.getContainers()
      if (response.data.code === 200 || response.data.code === 0) {
        console.log('容器数据:', response.data.data)
        return response.data.data || []
      } else {
        throw new Error(response.data.msg)
      }
    },
    refetchInterval: 10000, // 每10秒自动刷新一次
  })

  const handleContainerAction = async (containerId, action) => {
    try {
      // 设置操作状态为加载中
      setContainerActions(prev => ({
        ...prev,
        [containerId]: { action, loading: true }
      }))
      
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

      // 立即更新本地状态，提供即时反馈
      queryClient.setQueryData(['containers'], (oldData) => {
        if (!oldData) return oldData

        return oldData.map(container => {
          if (container.id === containerId) {
            let newStatus = container.status
            switch (action) {
              case 'start':
                newStatus = 'running'
                break
              case 'stop':
                newStatus = 'stopped'
                break
              case 'restart':
                newStatus = 'running'
                break
              default:
                break
            }
            return { ...container, status: newStatus }
          }
          return container
        })
      })

      // 清除操作状态
      setContainerActions(prev => {
        const newState = { ...prev }
        delete newState[containerId]
        return newState
      })

      // 延迟刷新以获取最新数据
      setTimeout(() => {
        refetch()
      }, 1500)

    } catch (error) {
      console.error('操作失败:', error)
      // 清除操作状态
      setContainerActions(prev => {
        const newState = { ...prev }
        delete newState[containerId]
        return newState
      })
      
      // 增加超时错误的处理
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error(`操作超时，请稍后手动刷新页面查看操作结果`)
      } else {
        console.error(`操作失败: ${error.response?.data?.msg || error.message}`)
      }
    }
  }

  // 批量操作处理函数
  const handleBatchAction = async (action) => {
    try {
      // 为所有选中的容器设置加载状态
      selectedContainers.forEach(containerId => {
        setContainerActions(prev => ({
          ...prev,
          [containerId]: { action, loading: true }
        }))
      })
      
      // 立即更新本地状态提供即时反馈
      if (action === 'start' || action === 'stop' || action === 'restart') {
        queryClient.setQueryData(['containers'], (oldData) => {
          if (!oldData) return oldData
          
          return oldData.map(container => {
            if (selectedContainers.includes(container.id)) {
              let newStatus = container.status
              switch (action) {
                case 'start':
                  newStatus = 'running'
                  break
                case 'stop':
                  newStatus = 'stopped'
                  break
                case 'restart':
                  newStatus = 'running'
                  break
                default:
                  break
              }
              return { ...container, status: newStatus }
            }
            return container
          })
        })
      }
      
      // 对每个选中的容器执行操作
      for (const containerId of selectedContainers) {
        try {
          const container = containers.find(c => c.id === containerId)
          
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
              if (container) {
                const response = await containerAPI.updateContainer(
                  containerId,
                  container.name,
                  container.usingImage,
                  true
                )
                
                if (response.data.code === 200 || response.data.code === 0) {
                  const taskID = response.data.data?.taskID
                  if (taskID) {
                    // 保存任务ID并开始轮询进度
                    setUpdateTasks(prev => ({
                      ...prev,
                      [containerId]: taskID
                    }))
                    // 调用轮询进度函数
                    pollProgress(containerId, taskID)
                  }
                }
              }
              break
            default:
              break
          }
        } finally {
          // 对于非更新操作，立即清除操作状态
          if (action !== 'update') {
            setContainerActions(prev => {
              const newState = { ...prev }
              delete newState[containerId]
              return newState
            })
          }
        }
      }

      // 如果不是更新操作，延迟刷新以获取最新数据
      if (action !== 'update') {
        setTimeout(() => {
          refetch()
        }, 1500)
      }
      
      // 清除选中状态
      setSelectedContainers([])
      setIsBatchMode(false)
    } catch (error) {
      console.error('批量操作失败:', error)
      // 清除所有操作状态
      selectedContainers.forEach(containerId => {
        setContainerActions(prev => {
          const newState = { ...prev }
          delete newState[containerId]
          return newState
        })
      })
      
      // 使用自定义弹窗显示错误信息
      setConfirmModal({
        isOpen: true,
        title: '操作失败',
        message: '批量操作失败: ' + (error.response?.data?.msg || error.message || '未知错误'),
        onConfirm: () => setConfirmModal({ isOpen: false }),
        onCancel: null,
        type: 'danger'
      });
    }
  }

  const handleRenameContainer = async (containerId, newName) => {
    try {
      const response = await containerAPI.renameContainer(containerId, newName)
      if (response.data.code === 200 || response.data.code === 0) {
        await refetch()
        console.log('重命名成功')
      }
    } catch (error) {
      console.error('重命名容器失败:', error)
      console.error(`重命名失败: ${error.response?.data?.msg || error.message}`)
    }
  }

  const handleUpdateContainer = async (containerId) => {
    try {
      const container = containers.find(c => c.id === containerId)
      if (!container) {
        console.error('容器未找到')
        return
      }

      console.log(`开始更新容器 "${container.name}"，使用镜像: ${container.usingImage}`)

      setContainerActions(prev => ({
        ...prev,
        [containerId]: { action: 'update', loading: true, progress: '正在准备更新...', percentage: 0 }
      }))

      // 注意参数顺序: id, containerName, imageNameAndTag, delOldContainer
      const response = await containerAPI.updateContainer(
        containerId,
        container.name,
        container.usingImage,
        true
      )

      console.log('更新容器响应:', response.data)

      if (response.data.code === 200 || response.data.code === 0) {
        const taskID = response.data.data?.taskID

        if (taskID) {
          console.log('开始轮询进度, taskID:', taskID)
          // 保存任务ID并开始轮询进度
          setUpdateTasks(prev => ({
            ...prev,
            [containerId]: taskID
          }))

          pollProgress(containerId, taskID)
        } else {
          // 如果没有返回taskID,说明更新可能立即完成
          setContainerActions(prev => {
            const newState = { ...prev }
            delete newState[containerId]
            return newState
          })
          await refetch()

        }
      } else {
        throw new Error(response.data.msg || '更新失败')
      }
    } catch (error) {
      console.error('更新容器失败:', error)
      setContainerActions(prev => {
        const newState = { ...prev }
        delete newState[containerId]
        return newState
      })
      
      // 增加超时错误的处理
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error(`更新操作已提交，但连接超时。请稍后手动刷新页面查看操作结果`)
        // 即使超时也触发轮询，因为操作可能仍在进行中
        // 这里我们不知道taskID，所以无法启动轮询，只能提示用户稍后查看
      } else {
        // 针对名称冲突提供特定的解决方案
        let errorMessage = error.response?.data?.msg || error.message;
        if (errorMessage.includes('重命名') || errorMessage.includes('name conflict') || errorMessage.includes('名称冲突')) {
          errorMessage += '\n\n检测到容器名称冲突问题，建议解决方案：\n' +
                         '1. 手动删除或重命名冲突的容器\n' +
                         '2. 使用不同的容器名称进行更新\n' +
                         '3. 先停止并重命名当前容器，再进行更新操作';
        }
        
        // 使用自定义弹窗显示错误信息
        setConfirmModal({
          isOpen: true,
          title: '更新失败',
          message: errorMessage,
          onConfirm: () => setConfirmModal({ isOpen: false }),
          onCancel: null,
          type: 'danger'
        });
      }
    }
  }

  // 轮询进度
  const pollProgress = async (containerId, taskID) => {
    const maxAttempts = 60 // 最多轮询60次 (2分钟)
    let attempts = 0
    let pollTimer = null

    const clearPollState = () => {
      if (pollTimer) {
        clearTimeout(pollTimer)
        pollTimer = null
      }
      setContainerActions(prev => {
        const newState = { ...prev }
        delete newState[containerId]
        return newState
      })
      setUpdateTasks(prev => {
        const newState = { ...prev }
        delete newState[containerId]
        return newState
      })
    }

    const poll = async () => {
      try {
        attempts++
        const response = await progressAPI.getProgress(taskID)
        console.log(`进度查询[${attempts}/${maxAttempts}]:`, response.data)

        const data = response.data

        // 提取进度信息
        let progressMsg = '处理中...'
        let percentage = 0

        if (data.data?.progress) {
          progressMsg = data.data.progress
        } else if (data.data?.message) {
          progressMsg = data.data.message
        } else if (data.msg) {
          progressMsg = data.msg
        }

        // 提取百分比
        if (data.data?.percentage !== undefined) {
          percentage = Math.min(100, Math.max(0, parseFloat(data.data.percentage)))
        } else if (data.data?.percent !== undefined) {
          percentage = Math.min(100, Math.max(0, parseFloat(data.data.percent)))
        } else {
          // 尝试从进度消息中提取百分比
          const percentMatch = progressMsg.match(/(\d+(?:\.\d+)?)\s*%/)
          if (percentMatch) {
            percentage = Math.min(100, Math.max(0, parseFloat(percentMatch[1])))
          } else {
            // 根据轮询次数估算进度
            percentage = Math.min(95, (attempts / maxAttempts) * 100)
          }
        }

        // 检查是否完成 - 兼容多种响应格式
        const status = data.data?.status || data.status
        const isCompleted = status === 'completed' || 
                          status === 'success' || 
                          status === 'done' ||
                          status === 'finish' ||
                          status === 'finished' ||
                          progressMsg.includes('完成') ||
                          progressMsg.includes('成功') ||
                          (data.code === 200 && (data.msg === 'success' || data.msg === '操作成功' || data.msg === '更新成功'))

        // 检查是否失败
        const isFailed = status === 'failed' || 
                        status === 'error' ||
                        progressMsg.includes('失败') ||
                        progressMsg.includes('错误') ||
                        data.code === 500 ||
                        data.code === 400

        if (isCompleted) {
          // 任务完成 - 立即停止轮询
          console.log('容器更新完成，停止轮询')
          clearPollState()
          await refetch()
          console.log('✅ 容器更新完成!')
          return // 确保不再继续执行
        }

        if (isFailed) {
          // 任务失败 - 立即停止轮询
          console.log('容器更新失败，停止轮询')
          clearPollState()
          // 添加更详细的错误信息
          const errorMsg = data.data?.error || data.data?.message || data.msg || '更新失败'
          console.error(`❌ 更新失败: ${errorMsg}`)
          
          return // 确保不再继续执行
        }

        // 更新容器操作状态，显示进度
        setContainerActions(prev => ({
          ...prev,
          [containerId]: { 
            action: 'update', 
            loading: true,
            progress: progressMsg,
            percentage: percentage
          }
        }))

        // 继续轮询
        if (attempts < maxAttempts) {
          pollTimer = setTimeout(poll, 2000) // 2秒后再次查询
        } else {
          clearPollState()
          console.error('⏱️ 更新超时，请检查容器状态')

        }
      } catch (error) {
        console.error('查询进度失败:', error)
        clearPollState()
        console.error(`❌ 更新失败: ${error.response?.data?.msg || error.message}`)
        // 显示网络错误或其他异常情况的友好提示
        
      }
    }

    // 开始轮询
    poll()
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



  // 获取状态指示器颜色
  const getStatusIndicatorColor = (status) => {
    const statusConfig = {
      running: 'bg-green-500',
      stopped: 'bg-red-500',
      restarting: 'bg-yellow-500',
      paused: 'bg-blue-500'
    }
    
    return statusConfig[status?.toLowerCase()] || 'bg-gray-500'
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
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      
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
          <div className="flex items-center space-x-3">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {containers.map((container) => (
          <div key={container.id} className="card relative overflow-hidden group transition-all duration-200 hover:shadow-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
            {/* 背景进度条 */}
            {containerActions[container.id]?.loading && containerActions[container.id]?.action === 'update' && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary-500/30 via-primary-400/30 to-primary-500/30 transition-all duration-500 ease-out"
                  style={{
                    width: `${containerActions[container.id].percentage || 0}%`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                       style={{
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 2s infinite linear'
                       }} />
                </div>
                {/* 进度百分比显示 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary-600/90 dark:bg-primary-500/90 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm">
                    {Math.round(containerActions[container.id].percentage || 0)}%
                  </div>
                </div>
              </div>
            )}
            <div className="relative z-10 flex items-center justify-between gap-4">
              {/* 左侧：选择框和图标 */}
              <div className="flex items-start space-x-4">
                {isBatchMode && (
                  <div className="flex-shrink-0 mt-1.5">
                    <input
                      type="checkbox"
                      checked={selectedContainers.includes(container.id)}
                      onChange={() => toggleContainerSelection(container.id)}
                      className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                )}
                
                {/* 图标和状态指示器 */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {(() => {
                      // 查找匹配的镜像图标
                      let iconUrl = container.iconUrl;

                      // 如果容器没有自定义图标，则查找镜像图标
                      if (!iconUrl && container.usingImage) {
                        // 优先使用内置logo配置（不依赖localStorage）
                        const builtInLogo = getImageLogo(container.usingImage);
                        if (builtInLogo) {
                          iconUrl = builtInLogo;
                        } else {
                          // 如果没有内置logo，则尝试从用户自定义中查找
                          const imageLogos = JSON.parse(localStorage.getItem('docker_copilot_image_logos') || '{}');
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
                            className="h-14 w-14 rounded-2xl object-cover shadow-md"
                            onError={(e) => {
                              // 如果图片加载失败，显示默认图标
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="h-14 w-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7 text-white">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                        );
                      } else {
                        return (
                          <div className="h-14 w-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                            <Package className="h-7 w-7 text-white" />
                          </div>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* 状态指示器竖线 */}
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className={cn(
                      "w-1 h-14 rounded-full",
                      getStatusIndicatorColor(container.status)
                    )}></div>
                  </div>
                </div>
              </div>
                
              {/* 中间：容器信息 */}
              <div className="flex-1 min-w-0 flex items-start gap-4">
                <div className="flex flex-col justify-center gap-1.5 text-left">
                  <div className="flex items-center gap-2">
                    <h3 
                      className="font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:underline text-lg"
                      onClick={() => setSelectedContainer(container)}
                    >
                      {container.name}
                    </h3>
                    {container.haveUpdate && (
                      <span className="badge-warning text-xs flex-shrink-0 px-2 py-0.5 rounded-full">可更新</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {container.usingImage}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3 w-3" />
                    <span>创建: {new Date(container.createTime).toLocaleDateString()}</span>
                  </div>
                  
                  {container.status === 'running' && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>运行: {container.runningTime}</span>
                    </div>
                  )}
                  
                  {containerActions[container.id]?.loading && containerActions[container.id]?.progress && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 truncate flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>{containerActions[container.id].progress}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* 右侧：状态和操作按钮 */}
              <div className="flex items-start flex-shrink-0 gap-2 flex-row">
                
                {/* 操作按钮 */}
                {!isBatchMode && (
                  <div className="grid grid-cols-2 gap-2">
                    {containerActions[container.id]?.loading ? (
                      <div className="col-span-2 flex items-center justify-center space-x-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary-600 dark:text-primary-400" />
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {containerActions[container.id].action === 'start' && '启动中'}
                          {containerActions[container.id].action === 'stop' && '停止中'}
                          {containerActions[container.id].action === 'restart' && '重启中'}
                          {containerActions[container.id].action === 'update' && '更新中'}
                        </span>
                      </div>
                    ) : (
                      <>
                        {container.status === 'running' ? (
                          <>
                            <button
                              onClick={() => handleContainerAction(container.id, 'stop')}
                              className="group relative text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 flex items-center shadow-sm hover:shadow px-3 py-2 space-x-1 justify-center"
                              title="停止容器"
                            >
                              <Square className="h-5 w-5" />
                              <span className="text-sm font-medium">停止</span>
                            </button>
                            <button
                              onClick={() => handleContainerAction(container.id, 'restart')}
                              className="group relative text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 flex items-center shadow-sm hover:shadow px-3 py-2 space-x-1 justify-center"
                              title="重启容器"
                            >
                              <RotateCcw className="h-5 w-5" />
                              <span className="text-sm font-medium">重启</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleContainerAction(container.id, 'start')}
                            className="group relative text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 flex items-center shadow-sm hover:shadow px-3 py-2 space-x-1 justify-center"
                            title="启动容器"
                          >
                            <Play className="h-5 w-5" />
                            <span className="text-sm font-medium">启动</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleUpdateContainer(container.id)}
                          className="group relative text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all duration-200 flex items-center shadow-sm hover:shadow px-3 py-2 space-x-1 justify-center"
                          title="更新容器"
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-sm font-medium">更新</span>
                        </button>

                        <button
                          onClick={() => setSelectedContainer(container)}
                          className="group relative text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 flex items-center shadow-sm hover:shadow px-3 py-2 space-x-1 justify-center"
                          title="查看详情"
                        >
                          <Info className="h-5 w-5" />
                          <span className="text-sm font-medium">详情</span>
                        </button>
                      </>
                    )}
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
      if (action === 'update') {
        await onUpdate(container.id);
      } else {
        await onAction(container.id, action);
      }
      
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
    if (name !== currentContainer.name) {
      try {
        setIsRenaming(true)
        console.log(`重命名容器: ${currentContainer.name} -> ${name}`)

        await onRename(container.id, name)

        // 无效化查询以触发重新获取数据
        await queryClient.invalidateQueries(['containers'])

        // 更新当前容器状态
        setCurrentContainer({ ...currentContainer, name: name })
        // 同时更新表单中的名称
        setName(name);

        console.log('✅ 容器重命名成功')
        setIsRenaming(false)
      } catch (error) {
        console.error('重命名失败:', error)
        setIsRenaming(false)
      }
    }
  }

  const handleSave = async () => {
    // 如果镜像tag发生变化，则更新容器
    if (imageNameAndTag !== currentContainer.usingImage) {
      try {
        setIsUpdating(true)

        console.log(`开始更新容器镜像: ${currentContainer.name}`)
        console.log(`原镜像: ${currentContainer.usingImage}`)
        console.log(`新镜像: ${imageNameAndTag}`)

        // 直接调用API更新容器
        const response = await containerAPI.updateContainer(
          container.id,
          container.name,
          imageNameAndTag,
          true // 删除旧容器
        )

        console.log('更新容器响应:', response.data)

        if (response.data.code === 200 || response.data.code === 0) {
          const taskID = response.data.data?.taskID

          if (taskID) {
            // 如果返回了taskID，我们需要触发进度轮询
            console.log('更新任务已创建，taskID:', taskID)
            
            // 关闭弹窗
            onClose()
            
            // 触发父组件中的进度轮询
            onUpdate(container.id)
            
            console.log('✅ 容器更新任务已启动，请在列表中查看进度')
          } else {
            // 没有taskID，更新完成
            await queryClient.invalidateQueries(['containers'])
            setImageNameAndTag(imageNameAndTag) // 更新本地状态
            console.log('✅ 容器镜像更新完成')
          }
        } else {
          throw new Error(response.data.msg || '更新失败')
        }

        setIsUpdating(false)
      } catch (error) {
        console.error('更新容器镜像失败:', error)
        // 增加超时错误的处理
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.error(`更新操作已提交，但连接超时。请稍后手动刷新页面查看操作结果`)
          // 即使超时也关闭弹窗并触发轮询，因为操作可能仍在进行中
          onClose()
          onUpdate(container.id)
        }
        setIsUpdating(false)
      }
    }
  }





  // 获取状态指示器颜色
  const getStatusIndicatorColor = (status) => {
    const statusConfig = {
      running: 'bg-green-500',
      stopped: 'bg-red-500',
      restarting: 'bg-yellow-500',
      paused: 'bg-blue-500'
    }
    
    return statusConfig[status?.toLowerCase()] || 'bg-gray-500'
  }

  // 获取容器图标 - 与列表显示逻辑一致
  const getContainerIcon = () => {
    let iconUrl = currentContainer.iconUrl;

    // 如果容器没有自定义图标，则查找镜像图标
    if (!iconUrl && currentContainer.usingImage) {
      // 优先使用内置logo配置（不依赖localStorage）
      const builtInLogo = getImageLogo(currentContainer.usingImage);
      if (builtInLogo) {
        iconUrl = builtInLogo;
      } else {
        // 如果没有内置logo，则尝试从用户自定义中查找
        const imageLogos = JSON.parse(localStorage.getItem('docker_copilot_image_logos') || '{}');
        for (const [imageName, logoUrl] of Object.entries(imageLogos)) {
          if (currentContainer.usingImage.startsWith(imageName) || 
              currentContainer.usingImage.includes(`${imageName}:`)) {
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
          alt={currentContainer.name} 
          className="h-12 w-12 rounded-xl object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            const parent = e.target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-white">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
              `;
            }
          }}
        />
      );
    } else {
      return (
        <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Package className="h-6 w-6 text-white" />
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* 弹窗头部 */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">容器详情</h3>
              <div className="flex items-center mt-1">
                {getContainerIcon()}
                {/* 状态指示器竖线 */}
                <div className="flex flex-col items-center justify-center h-full ml-3">
                  <div className={cn(
                    "w-1 h-8 rounded-full",
                    getStatusIndicatorColor(currentContainer.status)
                  )}></div>
                </div>
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentContainer.name}
                  </span>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
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
                disabled={isRenaming || (name === currentContainer.name) || isActionProcessing || isUpdating}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  isRenaming || (name === currentContainer.name)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
                }`}
              >
                {isRenaming ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    重命名中
                  </>
                ) : '重命名'}
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
                disabled={isUpdating || (imageNameAndTag === currentContainer.usingImage) || !imageNameAndTag.trim()}
                className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center ${
                  isUpdating || (imageNameAndTag === currentContainer.usingImage) || !imageNameAndTag.trim()
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
                }`}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    更新中
                  </>
                ) : (
                  '更换镜像'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              修改镜像后点击"更换镜像"按钮将重新创建容器
            </p>
          </div>
        </div>
        
        {/* 弹窗底部操作按钮 */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex justify-between">
            <button
              onClick={onClose}
              disabled={isActionProcessing || isUpdating}
              className="btn-secondary px-4 py-2"
            >
              关闭
            </button>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => onUpdate(container.id)}
                disabled={isActionProcessing || isUpdating}
                className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center ${
                  isActionProcessing && currentAction === 'update'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600'
                }`}
              >
                {isActionProcessing && currentAction === 'update' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    更新中
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    更新
                  </>
                )}
              </button>
              
              {currentContainer.status === 'running' ? (
                <>
                  <button 
                    onClick={() => handleContainerAction('stop')}
                    disabled={isActionProcessing || isUpdating}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center ${
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
                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center ${
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
                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center ${
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
          </div>
        </div>
      </div>
    </div>
  )
}