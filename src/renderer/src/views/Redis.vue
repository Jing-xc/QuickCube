<template>
    <div class="redis-container">
        <div class="header">
            <div class="tabs" :class="{ active: activeTab === 'terminal' }" @click="switchTab('terminal')">命令行</div>
            <div class="tabs" :class="{ active: activeTab === 'ui' }" @click="switchTab('ui')">面板UI</div>
            <div class="tabs" :class="{ active: activeTab === 'ui-2' }" @click="switchTab('ui-2')">面板UI-2</div>
        </div>
        <div class="main-content">
            <div class="client" ref="clientDiv" v-show="activeTab === 'terminal'">
                <div class="terminal">
                    <div class="connection-status" :class="{ connected: isConnected }">
                    </div>
                    <div class="command-help" v-if="currentCommandHelp">
                        <div class="help-content">
                            <div class="help-header">
                                <span class="command">{{ currentCommandHelp.command }}</span>
                                <span class="description">{{ currentCommandHelp.desc }}</span>
                            </div>
                            <div class="help-example">
                                <div class="example-title">使用示例:</div>
                                <div class="example-code">{{ currentCommandHelp.example }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="output" ref="outputArea">
                        <div class="output-line">Welcome to Redis Client Terminal</div>
                        <div class="output-line help">Type 'help' for available commands</div>
                    </div>
                    <div class="input-area">
                        <span class="prompt" :class="{ connected: isConnected }"></span>
                        <div class="input-wrapper">
                            <input type="text" class="command-input" v-model="currentCommand"
                                @keyup.enter="executeCommand" @keyup.up="navigateHistory('up')"
                                @keyup.down="navigateHistory('down')" @keydown="handleKeyDown" @input="handleInput"
                                ref="commandInput" placeholder="输入命令...">
                            <div class="suggestions" v-if="showSuggestions">
                                <div v-for="(suggestion, index) in suggestions" :key="suggestion[0]"
                                    class="suggestion-item" :class="{ selected: index === selectedSuggestionIndex }"
                                    @click="selectSuggestion(index)">
                                    <div class="suggestion-content">
                                        <div class="command-line">
                                            <span class="command">{{ suggestion[0] }}</span>
                                            <span class="description">{{ suggestion[1] }}</span>
                                        </div>
                                        <div class="example">示例: {{ suggestion[2] }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="redis-ui-2" v-show="activeTab === 'ui-2'">
                <RedisUI2 />
            </div>
            <!-- <div class="redis-ui" v-show="activeTab === 'ui'">
                <div class="ui-container">
                    <div class="sidebar">
                        <div class="database-list">
                            <div class="section-title">数据库列表</div>
                            <div class="db-item" v-for="db in databases" :key="db.index"
                                :class="{ active: currentDb === db.index }" @click="selectDatabase(db.index)">
                                DB{{ db.index }} ({{ db.keys || 0 }})
                            </div>
                        </div>
                        <div class="key-list">
                            <div class="section-title">
                                键列表
                                <div class="search-box">
                                    <input type="text" v-model="keyPattern" placeholder="搜索键...">
                                </div>
                            </div>
                            <div class="key-items" v-if="keys.length">
                                <div class="key-item" v-for="key in filteredKeys" :key="key.name"
                                    :class="{ active: currentKey === key.name }" @click="selectKey(key)">
                                    <span class="key-type" :class="key.type">{{ key.type }}</span>
                                    <span class="key-name">{{ key.name }}</span>
                                </div>
                            </div>
                            <div class="no-keys" v-else>
                                暂无数据
                            </div>
                        </div>
                    </div>
                    <div class="content-area">
                        <div class="key-info" v-if="currentKey">
                            <div class="info-header">
                                <div class="key-details">
                                    <h3>{{ currentKey }}</h3>
                                    <span class="type-badge">{{ currentKeyType }}</span>
                                </div>
                                <div class="actions">
                                    <button @click="refreshKey">刷新</button>
                                    <button class="danger" @click="deleteKey">删除</button>
                                </div>
                            </div>
                            <div class="key-content">
                                <RedisUI :type="currentKeyType" :value="keyContent" @update="updateKeyContent" />
                            </div>
                        </div>
                        <div class="welcome-screen" v-else>
                            <div class="welcome-content">
                                <h2>欢迎使用Redis图形界面</h2>
                                <p>请从左侧选择数据库和键以开始操作</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div> -->
            <ToolsSidebar />
        </div>
    </div>
</template>

<script setup>
// @ts-nocheck
import { ref, onMounted, nextTick, onUnmounted, watch, computed } from 'vue'
// 侧边工具栏组件
import ToolsSidebar from '../components/ToolsSidebar.vue'
// Redis值编辑器组件
import RedisUI from '../components/RedisUI.vue'
import RedisUI2 from '../components/RedisUI2.vue'
// Redis 常用命令列表
import { redisCommands } from '../constants/redisCommands'
// 在 script setup 部分添加
import { useRouter } from 'vue-router'
const router = useRouter()

// 使用window对象访问通过contextBridge暴露的API
const ipcRenderer = window.electron.ipcRenderer

const operationTab = ref(null)
const clientDiv = ref(null)
const currentCommand = ref('')
const outputArea = ref(null)
const commandInput = ref(null)
const isConnected = ref(false)
const commandHistory = ref([])
const currentHistoryIndex = ref(-1)
const showSuggestions = ref(false)
const suggestions = ref([])
const selectedSuggestionIndex = ref(-1)
const currentCommandHelp = ref(null)

// 添加新的状态管理
const activeTab = ref('terminal')
const databases = ref([])
const currentDb = ref(0)
const keys = ref([])
const currentKey = ref(null)
const currentKeyType = ref(null)
const keyContent = ref(null)
const keyPattern = ref('')
const currentKeyEditor = ref(null)

const updateArrowPosition = () => {
    if (!operationTab.value || !clientDiv.value) return
    const tabRect = operationTab.value.getBoundingClientRect()
    const clientRect = clientDiv.value.getBoundingClientRect()
    const leftOffset = tabRect.left + (tabRect.width / 2) - clientRect.left
    clientDiv.value.style.setProperty('--arrow-left', `${leftOffset}px`)
}

const appendOutput = (text, type = 'normal') => {
    const outputLine = document.createElement('div')
    outputLine.className = `output-line ${type}`
    outputLine.textContent = text
    outputArea.value.appendChild(outputLine)
    nextTick(() => {
        outputArea.value.scrollTop = outputArea.value.scrollHeight
    })
}

const navigateHistory = (direction) => {
    if (commandHistory.value.length === 0) return

    if (direction === 'up') {
        currentHistoryIndex.value = Math.min(
            currentHistoryIndex.value + 1,
            commandHistory.value.length - 1
        )
    } else {
        currentHistoryIndex.value = Math.max(currentHistoryIndex.value - 1, -1)
    }

    currentCommand.value = currentHistoryIndex.value >= 0
        ? commandHistory.value[commandHistory.value.length - 1 - currentHistoryIndex.value]
        : ''
}

const showHelp = () => {
    appendOutput('Available Commands:', 'help')
    appendOutput('  connect <host> <port> <password> - Connect to Redis server', 'help')
    appendOutput('  connect                          - Connect to local Redis server', 'help')
    appendOutput('  disconnect                       - Disconnect from Redis server', 'help')
    appendOutput('  clear                           - Clear terminal', 'help')
    appendOutput('  help                            - Show this help message', 'help')
}

const tryConnectLocal = async () => {
    try {
        const result = await ipcRenderer.invoke('redis:connect', {
            host: 'localhost',
            port: 6379
        })

        if (result.success) {
            isConnected.value = true
            appendOutput('Successfully connected to local Redis server', 'success')
        }
    } catch (error) {
        appendOutput('Local Redis server not available. Use "connect" command to specify connection details.', 'system')
    }
}

const clearTerminal = () => {
    while (outputArea.value.firstChild) {
        outputArea.value.removeChild(outputArea.value.firstChild)
    }
    appendOutput('Terminal cleared', 'system')
}

const executeCommand = async () => {
    if (!currentCommand.value.trim()) return

    const command = currentCommand.value.trim()

    // 添加到命令历史
    commandHistory.value.push(command)
    if (commandHistory.value.length > 50) {
        commandHistory.value.shift()
    }
    currentHistoryIndex.value = -1

    appendOutput(`> ${command}`)

    // 处理内部命令
    if (command.toLowerCase() === 'help') {
        showHelp()
        currentCommand.value = ''
        return
    }

    if (command.toLowerCase() === 'clear') {
        clearTerminal()
        currentCommand.value = ''
        return
    }

    if (command.toLowerCase() === 'disconnect') {
        try {
            await ipcRenderer.invoke('redis:disconnect')
            isConnected.value = false
            appendOutput('Disconnected from Redis server', 'system')
        } catch (error) {
            appendOutput(`Error: ${error.message}`, 'error')
        }
        currentCommand.value = ''
        return
    }

    // 处理连接命令
    if (command.toLowerCase().startsWith('connect')) {
        try {
            const parts = command.split(' ')

            // 如果只输入 connect，尝试连接本地 Redis
            if (parts.length === 1) {
                await tryConnectLocal()
                currentCommand.value = ''
                return
            }

            if (parts.length < 2) {
                appendOutput('Usage: connect <host> <port> <password>', 'error')
                appendOutput('   or: connect (to connect to local Redis)', 'error')
                currentCommand.value = ''
                return
            }

            const [_, host = 'localhost', port = '6379', password = ''] = parts
            const result = await ipcRenderer.invoke('redis:connect', {
                host,
                port: parseInt(port),
                password: password || undefined
            })

            if (result.success) {
                isConnected.value = true
                appendOutput(`Connected to Redis server at ${host}:${port} successfully`, 'success')
            } else {
                appendOutput(`Connection failed: ${result.message}`, 'error')
                appendOutput('Please check if:', 'error')
                appendOutput('1. Redis server is running', 'error')
                appendOutput('2. Host and port are correct', 'error')
                appendOutput('3. Password is correct (if required)', 'error')
            }
        } catch (error) {
            appendOutput(`Error: ${error.message}`, 'error')
            appendOutput('Please check if Redis server is running and accessible', 'error')
        }
    } else if (!isConnected.value) {
        appendOutput('Not connected to Redis server. Use "connect" command first.', 'error')
        appendOutput('Try "connect" to connect to local Redis server', 'system')
    } else {
        // 执行Redis命令
        try {
            const result = await ipcRenderer.invoke('redis:execute', command)
            if (result.success) {
                const formattedResult = typeof result.result === 'object'
                    ? JSON.stringify(result.result, null, 2)
                    : result.result
                appendOutput(formattedResult, 'success')
            } else {
                appendOutput(`Error: ${result.message}`, 'error')
            }
        } catch (error) {
            appendOutput(`Error: ${error.message}`, 'error')
            if (!isConnected.value) {
                appendOutput('Connection lost. Try reconnecting with "connect" command.', 'system')
            }
        }
    }

    currentCommand.value = ''
    currentCommandHelp.value = null  // 清除命令帮助
}

// 更新命令提示
const updateSuggestions = () => {
    if (!currentCommand.value) {
        showSuggestions.value = false
        return
    }

    const input = currentCommand.value.toLowerCase()
    const matchedCommands = Object.entries(redisCommands)
        .filter(([cmd]) => cmd.toLowerCase().startsWith(input))
        .slice(0, 5) // 最多显示5个提示
        .map(([cmd, info]) => [cmd, info.desc, info.example])

    if (matchedCommands.length > 0) {
        suggestions.value = matchedCommands
        showSuggestions.value = true
        selectedSuggestionIndex.value = -1
    } else {
        showSuggestions.value = false
    }
}

// 选择提示
const selectSuggestion = (index) => {
    if (index >= 0 && index < suggestions.value.length) {
        const command = suggestions.value[index][0]
        currentCommand.value = command
        currentCommandHelp.value = {
            command,
            ...redisCommands[command]
        }
        showSuggestions.value = false
        commandInput.value.focus()
    }
}

// 处理键盘导航
const handleKeyDown = (e) => {
    if (!showSuggestions.value) return

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault()
            selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % suggestions.value.length
            break
        case 'ArrowUp':
            e.preventDefault()
            selectedSuggestionIndex.value = selectedSuggestionIndex.value <= 0
                ? suggestions.value.length - 1
                : selectedSuggestionIndex.value - 1
            break
        case 'Tab':
        case 'Enter':
            if (selectedSuggestionIndex.value >= 0) {
                e.preventDefault()
                selectSuggestion(selectedSuggestionIndex.value)
            }
            break
        case 'Escape':
            showSuggestions.value = false
            break
    }
}

// 处理输入，更新当前命令帮助
const handleInput = () => {
    const command = currentCommand.value.trim().split(' ')[0].toLowerCase()
    if (command && redisCommands[command]) {
        currentCommandHelp.value = {
            command,
            ...redisCommands[command]
        }
    } else {
        currentCommandHelp.value = null
    }
    updateSuggestions()
}

// 监听命令输入
watch(currentCommand, () => {
    updateSuggestions()
})

// 监听命令帮助显示状态变化
watch(currentCommandHelp, () => {
    nextTick(() => {
        if (outputArea.value) {
            outputArea.value.scrollTop = outputArea.value.scrollHeight
        }
    })
}, { flush: 'post' })

// 监听建议列表显示状态变化
watch(showSuggestions, () => {
    nextTick(() => {
        if (outputArea.value) {
            outputArea.value.scrollTop = outputArea.value.scrollHeight
        }
    })
}, { flush: 'post' })

// 切换标签页
const switchTab = async (tab) => {
    activeTab.value = tab
    if (tab === 'ui' && isConnected.value) {
        await loadDatabases()
    }
}

// 加载数据库列表
const loadDatabases = async () => {
    try {
        const result = await ipcRenderer.invoke('redis:execute', 'INFO keyspace')
        // 解析INFO keyspace的结果来获取数据库列表
        databases.value = parseDatabaseInfo(result.result)
        if (databases.value.length > 0) {
            selectDatabase(0)
        }
    } catch (error) {
        console.error('Failed to load databases:', error)
    }
}

// 解析数据库信息
const parseDatabaseInfo = (info) => {
    const dbList = []
    if (typeof info === 'string') {
        const lines = info.split('\n')
        lines.forEach(line => {
            const match = line.match(/db(\d+):keys=(\d+)/)
            if (match) {
                dbList.push({
                    index: parseInt(match[1]),
                    keys: parseInt(match[2])
                })
            }
        })
    }
    return dbList
}

// 选择数据库
const selectDatabase = async (dbIndex) => {
    try {
        await ipcRenderer.invoke('redis:execute', `SELECT ${dbIndex}`)
        currentDb.value = dbIndex
        await loadKeys()
    } catch (error) {
        console.error('Failed to select database:', error)
    }
}

// 加载键列表
const loadKeys = async () => {
    try {
        const result = await ipcRenderer.invoke('redis:execute', 'KEYS *')
        keys.value = await Promise.all(result.result.map(async key => {
            const typeResult = await ipcRenderer.invoke('redis:execute', `TYPE ${key}`)
            return {
                name: key,
                type: typeResult.result
            }
        }))
    } catch (error) {
        console.error('Failed to load keys:', error)
    }
}

// 过滤键列表
const filteredKeys = computed(() => {
    if (!keyPattern.value) return keys.value
    return keys.value.filter(key =>
        key.name.toLowerCase().includes(keyPattern.value.toLowerCase())
    )
})

// 选择键
const selectKey = async (key) => {
    currentKey.value = key.name
    currentKeyType.value = key.type
    await loadKeyContent(key)
}

// 加载键内容
const loadKeyContent = async (key) => {
    try {
        let command
        switch (key.type) {
            case 'string':
                command = `GET ${key.name}`
                break
            case 'list':
                command = `LRANGE ${key.name} 0 -1`
                break
            case 'set':
                command = `SMEMBERS ${key.name}`
                break
            case 'hash':
                command = `HGETALL ${key.name}`
                break
            case 'zset':
                command = `ZRANGE ${key.name} 0 -1 WITHSCORES`
                break
        }
        const result = await ipcRenderer.invoke('redis:execute', command)

        // 对集合类型的结果进行排序
        if (key.type === 'set' && Array.isArray(result.result)) {
            result.result.sort()
        }

        keyContent.value = result.result
    } catch (error) {
        console.error('Failed to load key content:', error)
    }
}

// 刷新键内容
const refreshKey = async () => {
    if (currentKey.value) {
        const key = keys.value.find(k => k.name === currentKey.value)
        if (key) {
            await loadKeyContent(key)
        }
    }
}

// 删除键
const deleteKey = async () => {
    if (currentKey.value) {
        try {
            await ipcRenderer.invoke('redis:execute', `DEL ${currentKey.value}`)
            currentKey.value = null
            currentKeyType.value = null
            keyContent.value = null
            await loadKeys()
        } catch (error) {
            console.error('Failed to delete key:', error)
        }
    }
}

// 更新键内容
const updateKeyContent = async (newValue) => {
    try {
        if (updateTimeout) clearTimeout(updateTimeout)

        updateTimeout = setTimeout(async () => {
            switch (currentKeyType.value) {
                case 'list':
                    // 使用管道命令来优化性能
                    const pipeline = [`DEL ${currentKey.value}`]
                    if (newValue && newValue.length > 0) {
                        pipeline.push(`RPUSH ${currentKey.value} ${newValue.join(' ')}`)
                    }
                    // 执行管道命令
                    for (const cmd of pipeline) {
                        await ipcRenderer.invoke('redis:execute', cmd)
                    }
                    break
                case 'set':
                    await ipcRenderer.invoke('redis:execute', `DEL ${currentKey.value}`)
                    if (newValue && newValue.length > 0) {
                        const members = newValue.filter(Boolean)
                        if (members.length > 0) {
                            await ipcRenderer.invoke('redis:execute', `SADD ${currentKey.value} ${members.join(' ')}`)
                        }
                    }
                    break
                case 'string':
                    await ipcRenderer.invoke('redis:execute', `SET ${currentKey.value} ${newValue}`)
                    break
                case 'hash':
                    await ipcRenderer.invoke('redis:execute', `DEL ${currentKey.value}`)
                    if (newValue && newValue.length > 0) {
                        for (let i = 0; i < newValue.length; i += 2) {
                            if (newValue[i] && newValue[i + 1] !== undefined) {
                                await ipcRenderer.invoke('redis:execute',
                                    `HSET ${currentKey.value} ${newValue[i]} ${newValue[i + 1]}`)
                            }
                        }
                    }
                    break
                case 'zset':
                    await ipcRenderer.invoke('redis:execute', `DEL ${currentKey.value}`)
                    if (newValue && newValue.length > 0) {
                        for (let i = 0; i < newValue.length; i += 2) {
                            if (newValue[i] && newValue[i + 1] !== undefined) {
                                await ipcRenderer.invoke('redis:execute',
                                    `ZADD ${currentKey.value} ${newValue[i + 1]} ${newValue[i]}`)
                            }
                        }
                    }
                    break
            }
            await refreshKey()
        }, 300)
    } catch (error) {
        console.error('Failed to update key content:', error)
    }
}

// 监听连接状态变化
watch(isConnected, async (newValue) => {
    if (newValue && activeTab.value === 'ui') {
        await loadDatabases()
    }
})

// 添加防抖变量
let updateTimeout = null

onMounted(async () => {
    updateArrowPosition()
    window.addEventListener('resize', updateArrowPosition)
    commandInput.value.focus()
    showHelp()
    // 尝试自动连接本地Redis
    await tryConnectLocal()
})

onUnmounted(() => {
    window.removeEventListener('resize', updateArrowPosition)
})
</script>

<style scoped lang="scss">
.redis-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1a1d21;

    .header {
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 20px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        .tabs {
            padding: 8px 16px;
            color: #adb5bd;
            cursor: pointer;
            position: relative;
            transition: all 0.3s ease;
            font-size: 14px;

            &:hover {
                color: #ffffff;
            }

            &.active {
                color: #ffffff;
                position: relative;

                &::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, #ff4b2b, #ff416c);
                }
            }
        }
    }

    .main-content {
        display: flex;
        flex: 1;
        position: relative;
        height: calc(100vh - 40px);
    }

    .client {
        flex: 1;
        margin: 15px;
        position: relative;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        overflow: hidden;
        background-image: url('../assets/wavy-lines.svg');
        background-size: cover;
        background-position: center;
    }

    .terminal {
        height: 100%;
        padding: 15px;
        color: #e4e4e4;
        font-family: 'Consolas', monospace;
        display: flex;
        flex-direction: column;
        position: relative;


        .connection-status {
            position: static;
            margin-bottom: 15px;
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            gap: 8px;
            z-index: 2;

            &::before,
            &::after {
                content: '';
                width: 10px;
                height: 10px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            // 红灯
            &::before {
                background-color: #dc3545;
                box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
                animation: redPulse 2s infinite;
            }

            // 绿灯
            &::after {
                background-color: #28a745;
                opacity: 0.2;
            }

            &.connected {
                &::before {
                    background-color: #dc3545;
                    opacity: 0.2;
                    animation: none;
                }

                &::after {
                    opacity: 1;
                    box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
                    animation: greenPulse 2s infinite;
                }
            }
        }

        @keyframes redPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
            }

            70% {
                transform: scale(1.2);
                box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
            }

            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
            }
        }

        @keyframes greenPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
            }

            70% {
                transform: scale(1.2);
                box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
            }

            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
            }
        }

        .command-help {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid rgba(255, 255, 255, 0.05);

            .help-content {
                .help-header {
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;

                    .command {
                        color: #dc3545;
                        font-weight: bold;
                        padding: 4px 8px;
                        background: rgba(220, 53, 69, 0.1);
                        border-radius: 4px;
                    }

                    .description {
                        color: #e4e4e4;
                    }
                }

                .help-example {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 6px;
                    padding: 12px;
                    margin-top: 10px;

                    .example-title {
                        color: #adb5bd;
                        margin-bottom: 8px;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .example-code {
                        color: #28a745;
                        font-family: 'Consolas', monospace;
                        padding: 8px 12px;
                        background: rgba(40, 167, 69, 0.1);
                        border-radius: 4px;
                        border-left: 3px solid #28a745;
                    }
                }
            }
        }

        .output {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 15px;
            padding-bottom: 10px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;

            &::-webkit-scrollbar {
                width: 6px;
            }

            &::-webkit-scrollbar-track {
                background: transparent;
            }

            &::-webkit-scrollbar-thumb {
                background-color: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
        }

        .input-area {
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.3);
            padding: 8px 12px;
            border-radius: 4px;
            margin-top: auto;
            position: relative;

            .prompt {
                margin-right: 12px;
                display: flex;
                align-items: center;

                &::before {
                    content: '';
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #dc3545;
                    display: inline-block;
                }

                &.connected::before {
                    background-color: #28a745;
                    box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
                    animation: promptPulse 2s infinite;
                }
            }

            .input-wrapper {
                flex: 1;
                position: relative;

                .command-input {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #e4e4e4;
                    font-family: 'Consolas', monospace;
                    font-size: 14px;
                    outline: none;

                    &::placeholder {
                        color: #6c757d;
                    }
                }

                .suggestions {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    background: #1a1d21;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1;

                    &::-webkit-scrollbar {
                        width: 6px;
                    }

                    &::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    &::-webkit-scrollbar-thumb {
                        background-color: rgba(255, 255, 255, 0.2);
                        border-radius: 3px;
                    }

                    .suggestion-item {
                        padding: 8px 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;

                        &:hover,
                        &.selected {
                            background: rgba(255, 255, 255, 0.05);
                        }

                        .suggestion-content {
                            .command-line {
                                margin-bottom: 4px;

                                .command {
                                    color: #dc3545;
                                    margin-right: 10px;
                                }

                                .description {
                                    color: #adb5bd;
                                    font-size: 12px;
                                }
                            }

                            .example {
                                color: #28a745;
                                font-size: 12px;
                                font-family: 'Consolas', monospace;
                            }
                        }
                    }
                }
            }
        }
    }

    .redis-ui-2 {
        flex: 1;
        display: flex;
        min-width: 0;
        overflow: hidden;
    }

    .redis-ui {
        flex: 1;
        margin: 12px;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        background-image: url('../assets/wavy-lines.svg');
        background-size: cover;
        background-position: center;

        .ui-container {
            display: flex;
            height: 100%;

            .sidebar {
                width: 280px;
                //background: #333333;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;

                .database-list {
                    padding: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                    .section-title {
                        color: #e4e4e4;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 10px;
                    }

                    .db-item {
                        padding: 6px 10px;
                        color: #e4e4e4;
                        cursor: pointer;
                        border-radius: 10px;
                        transition: all 0.3s ease;
                        margin-bottom: 4px;

                        &:hover {
                            background: rgba(255, 255, 255, 0.05);
                            transform: translateX(4px);
                        }

                        &.active {
                            background: rgba(76, 175, 80, 0.2);
                            color: #4CAF50;
                        }
                    }
                }

                .key-list {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;

                    .section-title {
                        padding: 12px;
                        color: #e4e4e4;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                        .search-box {
                            margin-top: 10px;

                            input {
                                width: 100%;
                                background: #2a2a2a;
                                border: 2px solid rgba(255, 255, 255, 0.1);
                                border-radius: 10px;
                                padding: 6px 10px;
                                color: #e4e4e4;
                                font-size: 12px;
                                transition: all 0.3s ease;

                                &:focus {
                                    border-color: #4CAF50;
                                    outline: none;
                                    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
                                }

                                &::placeholder {
                                    color: rgba(255, 255, 255, 0.3);
                                }
                            }
                        }
                    }

                    .key-items {
                        flex: 1;
                        overflow-y: auto;
                        padding: 12px;

                        &::-webkit-scrollbar {
                            width: 6px;
                        }

                        &::-webkit-scrollbar-track {
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 10px;
                        }

                        &::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 10px;

                            &:hover {
                                background: rgba(255, 255, 255, 0.15);
                            }
                        }

                        .key-item {
                            display: flex;
                            align-items: center;
                            padding: 8px 10px;
                            cursor: pointer;
                            border-radius: 10px;
                            margin-bottom: 5px;
                            transition: all 0.3s ease;
                            border: 2px solid transparent;

                            &:hover {
                                background: rgba(255, 255, 255, 0.05);
                                transform: translateX(4px);
                            }

                            &.active {
                                background: rgba(76, 175, 80, 0.1);
                                border-color: rgba(76, 175, 80, 0.2);
                                color: #4CAF50;
                            }

                            .key-type {
                                padding: 3px 6px;
                                border-radius: 8px;
                                font-size: 11px;
                                margin-right: 8px;
                                font-weight: 500;

                                &.string {
                                    background: rgba(76, 175, 80, 0.1);
                                    color: #4CAF50;
                                }

                                &.list {
                                    background: rgba(33, 150, 243, 0.1);
                                    color: #2196F3;
                                }

                                &.set {
                                    background: rgba(255, 193, 7, 0.1);
                                    color: #FFC107;
                                }

                                &.hash {
                                    background: rgba(156, 39, 176, 0.1);
                                    color: #9C27B0;
                                }

                                &.zset {
                                    background: rgba(0, 188, 212, 0.1);
                                    color: #00BCD4;
                                }
                            }

                            .key-name {
                                flex: 1;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                                color: #e4e4e4;
                            }
                        }
                    }

                    .no-keys {
                        padding: 30px 20px;
                        text-align: center;
                        color: rgba(255, 255, 255, 0.3);
                        font-size: 14px;
                    }
                }
            }

            .content-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;


                .key-info {
                    height: 100%;
                    display: flex;
                    flex-direction: column;

                    .info-header {


                        .key-details {

                            h3 {}

                            .type-badge {}
                        }

                        .actions {


                            button {


                                &:not(.danger) {
                                    background: rgba(255, 255, 255, 0.1);
                                    color: #e4e4e4;

                                    &:hover {
                                        background: rgba(255, 255, 255, 0.15);
                                        transform: translateY(-1px);
                                    }
                                }

                                &.danger {
                                    background: rgba(255, 77, 79, 0.1);
                                    color: #ff4d4f;

                                    &:hover {
                                        background: rgba(255, 77, 79, 0.2);
                                        transform: translateY(-1px);
                                    }
                                }
                            }
                        }
                    }

                    .key-content {
                        flex: 1;
                        padding: 16px;
                        overflow: auto;

                        &::-webkit-scrollbar {
                            width: 6px;
                        }

                        &::-webkit-scrollbar-track {
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 10px;
                        }

                        &::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 10px;

                            &:hover {
                                background: rgba(255, 255, 255, 0.15);
                            }
                        }
                    }
                }

                .welcome-screen {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 30px;


                    .welcome-content {
                        text-align: center;
                        color: rgba(255, 255, 255, 0.3);

                        h2 {
                            margin-bottom: 16px;
                            color: #e4e4e4;
                            font-size: 22px;
                        }

                        p {
                            font-size: 15px;
                        }
                    }
                }
            }
        }
    }
}
</style>