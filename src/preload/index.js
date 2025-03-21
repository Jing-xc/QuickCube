import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 定义有效的IPC通道
const validChannels = [
  'redis:connect', 'redis:disconnect', 'redis:execute',
  'mysql:connect', 'mysql:disconnect', 'mysql:execute',
  'mysql:importExcel', 'dialog:openFile','mysql:exportExcel'
]

// 统一的IPC调用处理
const ipcInvoke = (channel, data) => {
  if (validChannels.includes(channel)) {
    return ipcRenderer.invoke(channel, data)
  }
  return Promise.reject(new Error('无效的通道'))
}

// 定义API
const api = {
  redis: {
    connect: config => ipcInvoke('redis:connect', config),
    disconnect: () => ipcInvoke('redis:disconnect'),
    execute: command => ipcInvoke('redis:execute', command)
  },
  mysql: {
    connect: config => ipcInvoke('mysql:connect', config),
    disconnect: () => ipcInvoke('mysql:disconnect'),
    execute: query => ipcInvoke('mysql:execute', query),
    importExcel: params => ipcInvoke('mysql:importExcel', params),
    exportExcel: params => ipcInvoke('mysql:exportExcel', params)
  },
  dir:{
    openFile:()=>ipcInvoke('dialog:openFile')
  }
}

// 暴露API到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: { invoke: ipcInvoke }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = {
    ...electronAPI,
    ipcRenderer: { invoke: ipcInvoke }
  }
  window.api = api
}
