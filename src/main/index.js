import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Redis from 'ioredis'
import mysql from 'mysql2/promise'

let redisClient = null
let mysqlConnection = null

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

// MySQL 连接处理
ipcMain.handle('mysql:connect', async (_, config) => {
  try {
    if (mysqlConnection) {
      await mysqlConnection.end()
    }

    mysqlConnection = await mysql.createConnection({
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database
    })

    await mysqlConnection.connect()
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// MySQL 断开连接
ipcMain.handle('mysql:disconnect', async () => {
  try {
    if (mysqlConnection) {
      await mysqlConnection.end()
      mysqlConnection = null
    }
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// MySQL 命令执行
ipcMain.handle('mysql:execute', async (_, query) => {
  try {
    if (!mysqlConnection) {
      throw new Error('Not connected to MySQL server')
    }

    // 处理特殊命令
    const lowerQuery = query.toLowerCase().trim()
    
    // 处理 USE 命令
    if (lowerQuery.startsWith('use ')) {
      const [rows] = await mysqlConnection.query(query)
      return { 
        success: true, 
        message: `Database changed to ${query.split(' ')[1]}`
      }
    }
    
    // 处理 SHOW DATABASES 命令
    if (lowerQuery === 'show databases') {
      const [rows] = await mysqlConnection.query(query)
      return {
        success: true,
        data: rows.map(row => ({
          "数据库名": row.Database,
        }))
      }
    }
    
    // 处理 SHOW TABLES 命令
    if (lowerQuery === 'show tables') {
      const [rows] = await mysqlConnection.query(query)
      const key = Object.keys(rows[0])[0]
      return {
        success: true,
        data: rows.map(row => ({
          "表名": row[key]
        }))
      }
    }
    
    // 处理 DESCRIBE 命令
    if (lowerQuery.startsWith('describe ') || lowerQuery.startsWith('desc ')) {
      const [rows] = await mysqlConnection.query(query)
      return {
        success: true,
        data: rows.map(row => ({
          "字段名": row.Field,
          "类型": row.Type,
          "允许空": row.Null,
          "键": row.Key,
          "默认值": row.Default || '',
          "额外": row.Extra || ''
        }))
      }
    }

    // 处理其他查询
    const [rows] = await mysqlConnection.query(query)
    
    // 如果是 SELECT 查询且有结果
    if (Array.isArray(rows) && rows.length > 0) {
      // 获取所有列名
      const columns = Object.keys(rows[0])
      
      // 处理每一行数据
      const formattedRows = rows.map(row => {
        const formattedRow = {}
        columns.forEach(col => {
          // 处理特殊类型的值
          let value = row[col]
          
          // 处理不同类型的值
          if (value === null || value === undefined) {
            value = 'NULL'
          } else if (value instanceof Date) {
            value = value.toLocaleString('zh-CN')
          } else if (Buffer.isBuffer(value)) {
            value = `<Binary: ${value.length} bytes>`
          } else if (typeof value === 'object') {
            value = JSON.stringify(value)
          } else {
            // 转换为字符串
            value = String(value)
            // 如果是长字符串，截断显示
            if (value.length > 50) {
              value = value.substring(0, 47) + '...'
            }
          }
          
          // 添加格式化后的值
          formattedRow[col] = value
        })
        return formattedRow
      })

      return { 
        success: true, 
        data: formattedRows,
        summary: `查询返回 ${rows.length} 条记录`
      }
    }
    
    // 处理 INSERT、UPDATE、DELETE 等操作
    if (rows.affectedRows !== undefined) {
      let message = ''
      if (lowerQuery.startsWith('insert')) {
        message = `已插入 ${rows.affectedRows} 行记录`
        if (rows.insertId) {
          message += `，自增ID: ${rows.insertId}`
        }
      } else if (lowerQuery.startsWith('update')) {
        message = `已更新 ${rows.affectedRows} 行记录`
      } else if (lowerQuery.startsWith('delete')) {
        message = `已删除 ${rows.affectedRows} 行记录`
      } else {
        message = `操作影响了 ${rows.affectedRows} 行记录`
      }
      return { success: true, message }
    }

    return { success: true, data: rows }
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

// 确保在应用退出时关闭所有连接
app.on('before-quit', async () => {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
  if (mysqlConnection) {
    await mysqlConnection.end()
    mysqlConnection = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
