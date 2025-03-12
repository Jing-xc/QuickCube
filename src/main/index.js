import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Redis from 'ioredis'

let redisClient = null

// Redis 连接处理
ipcMain.handle('redis:connect', async (_, config) => {
  try {
    if (redisClient) {
      await redisClient.quit()
    }

    redisClient = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })

    await redisClient.ping()
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// Redis 断开连接
ipcMain.handle('redis:disconnect', async () => {
  try {
    if (redisClient) {
      await redisClient.quit()
      redisClient = null
    }
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// Redis 命令执行
ipcMain.handle('redis:execute', async (_, command) => {
  try {
    if (!redisClient) {
      throw new Error('Not connected to Redis server')
    }

    const args = command.split(' ')
    const cmd = args[0].toLowerCase()
    const params = args.slice(1)

    const result = await redisClient[cmd](...params)
    return { success: true, result }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 确保在应用退出时关闭Redis连接
app.on('before-quit', async () => {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
