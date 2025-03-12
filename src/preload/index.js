import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Redis 相关操作
  redis: {
    connect: (config) => ipcRenderer.invoke('redis:connect', config),
    disconnect: () => ipcRenderer.invoke('redis:disconnect'),
    execute: (command) => ipcRenderer.invoke('redis:execute', command)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: {
        invoke: (channel, data) => {
          const validChannels = ['redis:connect', 'redis:disconnect', 'redis:execute']
          if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data)
          }
          return Promise.reject(new Error('Invalid channel'))
        }
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = {
    ...electronAPI,
    ipcRenderer: {
      invoke: (channel, data) => {
        const validChannels = ['redis:connect', 'redis:disconnect', 'redis:execute']
        if (validChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, data)
        }
        return Promise.reject(new Error('Invalid channel'))
      }
    }
  }
  window.api = api
}
