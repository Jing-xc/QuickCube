<template>
    <div class="redis-container">
        <div class="header">
            <div class="tabs" ref="operationTab">操作台</div>
            <div class="tabs">账号</div>
        </div>
        <div class="main-content">
            <div class="client" ref="clientDiv">
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
            <div class="tools-sidebar">
                <div class="tool-item active">
                    <div class="tool-icon redis">
                        <svg viewBox="0 0 32 32" fill="currentColor">
                            <path
                                d="M24.628 13.843l-0.143-0.115c-2.115-1.694-4.359-2.584-6.64-2.584-1.726 0-3.496 0.459-5.271 1.364l-0.372 0.199c-2.084 1.037-3.496 1.527-4.631 1.527-0.82 0-1.553-0.261-2.177-0.774-0.64-0.526-0.985-1.236-0.985-2.021 0-0.995 0.422-1.836 1.251-2.495 0.82-0.652 1.836-0.985 3.024-0.985 1.188 0 2.495 0.333 3.889 0.985l0.372 0.171c2.084 1.037 3.496 1.527 4.631 1.527 0.82 0 1.553-0.261 2.177-0.774 0.64-0.526 0.985-1.236 0.985-2.021 0-0.995-0.422-1.836-1.251-2.495-0.82-0.652-1.836-0.985-3.024-0.985-1.188 0-2.495 0.333-3.889 0.985l-0.372 0.171c-2.084 1.037-3.496 1.527-4.631 1.527-0.82 0-1.553-0.261-2.177-0.774-0.64-0.526-0.985-1.236-0.985-2.021 0-0.995 0.422-1.836 1.251-2.495 0.82-0.652 1.836-0.985 3.024-0.985 1.188 0 2.495 0.333 3.889 0.985l0.372 0.171c2.084 1.037 3.496 1.527 4.631 1.527v-2.048c-1.188 0-2.495-0.333-3.889-0.985l-0.372-0.171c-2.084-1.037-3.496-1.527-4.631-1.527-1.639 0-3.062 0.526-4.258 1.57-1.196 1.037-1.802 2.305-1.802 3.781 0 1.476 0.606 2.744 1.802 3.781 1.196 1.044 2.619 1.57 4.258 1.57 1.639 0 3.062-0.526 4.258-1.57 0.249-0.214 0.473-0.442 0.67-0.67 0.197 0.228 0.421 0.456 0.67 0.67 1.196 1.044 2.619 1.57 4.258 1.57 1.639 0 3.062-0.526 4.258-1.57 1.196-1.037 1.802-2.305 1.802-3.781 0-0.249-0.021-0.491-0.064-0.725z">
                            </path>
                        </svg>
                    </div>
                    <span class="tool-name">Redis</span>
                </div>
                <div class="tool-item">
                    <div class="tool-icon mysql">
                        <svg viewBox="0 0 32 32" fill="currentColor">
                            <path
                                d="M8.785 6.865c-0.187 0-0.319 0.022-0.451 0.053v0.022h0.027c0.088 0.177 0.243 0.307 0.355 0.466 0.088 0.177 0.168 0.355 0.257 0.532l0.027-0.027c0.159-0.111 0.239-0.292 0.239-0.559-0.071-0.088-0.080-0.177-0.142-0.266-0.071-0.133-0.222-0.2-0.31-0.221zM29.857 23.185c-1.822-0.044-3.232 0.133-4.415 0.621-0.345 0.133-0.885 0.133-0.929 0.558 0.186 0.186 0.213 0.487 0.372 0.743 0.283 0.461 0.779 1.081 1.23 1.399 0.487 0.372 0.974 0.743 1.487 1.063 0.911 0.531 1.929 0.841 2.813 1.372 0.514 0.319 1.027 0.727 1.54 1.072 0.257 0.177 0.416 0.461 0.743 0.558v-0.062c-0.168-0.213-0.213-0.514-0.372-0.743-0.23-0.23-0.461-0.443-0.69-0.674-0.674-0.903-1.513-1.69-2.415-2.335-0.743-0.487-2.375-1.214-2.679-2.070l-0.053-0.053c0.513-0.044 1.115-0.23 1.601-0.372 0.797-0.23 1.513-0.168 2.335-0.372 0.372-0.097 0.743-0.23 1.115-0.346v-0.23c-0.416-0.425-0.717-0.991-1.152-1.389-1.168-1.027-2.441-2.035-3.761-2.876-0.708-0.451-1.601-0.743-2.354-1.133-0.257-0.133-0.69-0.195-0.841-0.416-0.381-0.479-0.602-1.106-0.885-1.674-0.619-1.168-1.222-2.468-1.755-3.707-0.381-0.832-0.619-1.655-1.098-2.415-2.228-3.581-4.634-5.747-8.351-7.87-0.797-0.425-1.752-0.602-2.767-0.823-0.541-0.027-1.081-0.062-1.621-0.088-0.345-0.142-0.69-0.531-0.991-0.717-1.23-0.779-4.387-2.459-5.289-0.239-0.575 1.399 0.858 2.776 1.364 3.478 0.363 0.505 0.832 1.072 1.098 1.638 0.16 0.372 0.195 0.761 0.345 1.152 0.345 0.947 0.681 2.002 1.152 2.891 0.239 0.451 0.504 0.92 0.814 1.328 0.168 0.222 0.461 0.319 0.531 0.682-0.292 0.416-0.319 1.063-0.487 1.592-0.761 2.388-0.469 5.36 0.619 7.119 0.345 0.531 1.152 1.68 2.238 1.239 0.962-0.372 0.743-1.602 1.019-2.673 0.062-0.257 0.027-0.425 0.142-0.594v0.053c0.283 0.557 0.558 1.098 0.823 1.655 0.619 0.991 1.7 2.025 2.602 2.713 0.478 0.372 0.858 1.019 1.461 1.248v-0.062h-0.053c-0.115-0.186-0.301-0.266-0.451-0.416-0.354-0.354-0.743-0.797-1.027-1.187-0.823-1.115-1.54-2.335-2.187-3.601-0.319-0.62-0.593-1.293-0.858-1.913-0.115-0.23-0.115-0.575-0.31-0.69-0.283 0.425-0.69 0.797-0.903 1.328-0.345 0.841-0.389 1.867-0.514 2.932-0.080 0.027-0.044 0.009-0.088 0.053-0.619-0.151-0.832-0.787-1.063-1.328-0.575-1.391-0.682-3.618-0.177-5.219 0.133-0.416 0.743-1.716 0.504-2.105-0.124-0.381-0.531-0.602-0.761-0.903-0.283-0.372-0.557-0.858-0.743-1.293-0.487-1.124-0.726-2.376-1.258-3.494-0.257-0.531-0.69-1.081-1.045-1.558-0.398-0.531-0.832-0.903-1.152-1.532-0.115-0.222-0.266-0.575-0.088-0.814 0.053-0.16 0.133-0.222 0.31-0.266 0.283-0.239 1.098 0.071 1.381 0.195 0.814 0.319 1.487 0.619 2.167 1.063 0.319 0.212 0.646 0.619 1.045 0.727h0.461c0.708 0.16 1.505 0.044 2.167 0.257 1.177 0.398 2.238 0.974 3.185 1.603 2.908 1.929 5.289 4.676 6.914 7.959 0.266 0.531 0.381 1.027 0.619 1.584 0.461 1.080 1.027 2.187 1.487 3.238 0.461 1.027 0.91 2.072 1.558 2.932 0.345 0.461 1.674 0.708 2.291 0.947 0.451 0.195 1.142 0.372 1.54 0.602 0.761 0.451 1.505 0.974 2.228 1.461 0.354 0.248 1.46 0.814 1.522 1.258z">
                            </path>
                        </svg>
                    </div>
                    <span class="tool-name">MySQL</span>
                </div>
                <div class="tool-item">
                    <div class="tool-icon mongo">
                        <svg viewBox="0 0 32 32" fill="currentColor">
                            <path
                                d="M15.821 23.185s0-10.361 0.344-10.361c0.266 0 0.612 13.365 0.612 13.365-0.476-0.056-0.956-2.952-0.956-3.004zM15.768 9.29c0.266-0.851 0.425-1.703 0.425-2.553 0-0.159 0-0.328-0.011-0.487-0.011-0.148-0.011-0.297-0.032-0.444v-0.064c-0.043-0.339-0.106-0.678-0.19-1.006-0.074-0.36-0.169-0.72-0.275-1.069 0 0-0.032-0.085-0.042-0.127-0.201-0.508-0.434-1.005-0.699-1.481-1.069-1.894-2.566-3.341-3.772-3.983-0.19-0.106-0.381-0.19-0.571-0.254l-0.064-0.021c-0.042 0.381-0.064 0.763-0.064 1.154 0 0.709 0.085 1.418 0.254 2.117 0.148 0.647 0.36 1.271 0.625 1.873 0.18 0.402 0.381 0.794 0.603 1.175 0.18 0.307 0.381 0.603 0.593 0.889 0.18 0.254 0.381 0.487 0.582 0.72 0.169 0.201 0.339 0.402 0.519 0.593 0.212 0.233 0.434 0.455 0.667 0.667 0.201 0.19 0.402 0.381 0.614 0.561 0.275 0.233 0.561 0.455 0.857 0.667 0.127 0.095 0.254 0.18 0.381 0.265z">
                            </path>
                        </svg>
                    </div>
                    <span class="tool-name">MongoDB</span>
                </div>
                <div class="tool-item">
                    <div class="tool-icon postgres">
                        <svg viewBox="0 0 32 32" fill="currentColor">
                            <path
                                d="M16 0c-4.971 0-8.935 1.16-11.131 2.904-1.819 1.44-2.869 3.24-2.869 5.096v16c0 1.856 1.051 3.656 2.869 5.096 2.196 1.744 6.16 2.904 11.131 2.904s8.935-1.16 11.131-2.904c1.819-1.44 2.869-3.24 2.869-5.096v-16c0-1.856-1.051-3.656-2.869-5.096-2.196-1.744-6.16-2.904-11.131-2.904zM16 2c4.629 0 8.189 1.055 9.969 2.496 1.389 1.12 2.031 2.384 2.031 3.504s-0.643 2.384-2.031 3.504c-1.781 1.441-5.34 2.496-9.969 2.496s-8.189-1.055-9.969-2.496c-1.389-1.12-2.031-2.384-2.031-3.504s0.643-2.384 2.031-3.504c1.781-1.441 5.34-2.496 9.969-2.496z">
                            </path>
                        </svg>
                    </div>
                    <span class="tool-name">PostgreSQL</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
// @ts-nocheck
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'

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

// Redis 常用命令列表
const redisCommands = {
    'get': {
        desc: '获取键值',
        example: 'get mykey'
    },
    'set': {
        desc: '设置键值',
        example: 'set mykey myvalue'
    },
    'del': {
        desc: '删除键',
        example: 'del mykey'
    },
    'exists': {
        desc: '检查键是否存在',
        example: 'exists mykey'
    },
    'keys': {
        desc: '查找所有符合给定模式的键',
        example: 'keys user:*'
    },
    'incr': {
        desc: '将键值递增',
        example: 'incr counter'
    },
    'decr': {
        desc: '将键值递减',
        example: 'decr counter'
    },
    'hget': {
        desc: '获取哈希表中的字段值',
        example: 'hget user:1 name'
    },
    'hset': {
        desc: '设置哈希表字段值',
        example: 'hset user:1 name zhangsan'
    },
    'hdel': {
        desc: '删除哈希表字段',
        example: 'hdel user:1 name'
    },
    'hkeys': {
        desc: '获取哈希表所有字段',
        example: 'hkeys user:1'
    },
    'hvals': {
        desc: '获取哈希表所有值',
        example: 'hvals user:1'
    },
    'lpush': {
        desc: '在列表头部插入元素',
        example: 'lpush mylist value1 value2'
    },
    'rpush': {
        desc: '在列表尾部插入元素',
        example: 'rpush mylist value'
    },
    'lpop': {
        desc: '移除并返回列表第一个元素',
        example: 'lpop mylist'
    },
    'rpop': {
        desc: '移除并返回列表最后一个元素',
        example: 'rpop mylist'
    },
    'lrange': {
        desc: '获取列表指定范围内的元素',
        example: 'lrange mylist 0 -1'
    },
    'sadd': {
        desc: '向集合添加成员',
        example: 'sadd myset member1 member2'
    },
    'srem': {
        desc: '移除集合成员',
        example: 'srem myset member1'
    },
    'smembers': {
        desc: '获取集合所有成员',
        example: 'smembers myset'
    },
    'zadd': {
        desc: '向有序集合添加成员',
        example: 'zadd rankings 89.5 user1'
    },
    'zrange': {
        desc: '获取有序集合指定范围内的成员',
        example: 'zrange rankings 0 -1 withscores'
    },
    'expire': {
        desc: '设置键的过期时间(秒)',
        example: 'expire mykey 3600'
    },
    'ttl': {
        desc: '获取键的剩余过期时间',
        example: 'ttl mykey'
    },
    'type': {
        desc: '获取键的数据类型',
        example: 'type mykey'
    },
    'info': {
        desc: '获取Redis服务器信息',
        example: 'info'
    },
    'select': {
        desc: '切换数据库',
        example: 'select 1'
    },
    'flushdb': {
        desc: '清空当前数据库',
        example: 'flushdb'
    },
    'ping': {
        desc: '测试连接',
        example: 'ping'
    },
    'connect': {
        desc: '连接Redis服务器',
        example: 'connect 127.0.0.1 6379'
    },
    'clear': {
        desc: '清空终端',
        example: 'clear'
    },
    'help': {
        desc: '显示帮助信息',
        example: 'help'
    }
}

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

            &:first-child {
                color: #ffffff;

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

    .tools-sidebar {
        width: 80px;
        background: #1a1d21;
        padding: 20px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);

        .tool-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 12px;
            border-radius: 8px;
            transition: all 0.3s ease;
            width: 64px;
            position: relative;

            &:hover {
                background: rgba(255, 255, 255, 0.05);
                transform: translateY(-2px);
            }

            &.active {
                background: rgba(255, 255, 255, 0.05);

                &::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 3px;
                    height: 24px;
                    background: linear-gradient(180deg, #ff4b2b, #ff416c);
                    border-radius: 0 2px 2px 0;
                }
            }

            .tool-icon {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;

                svg {
                    width: 100%;
                    height: 100%;
                }

                &.redis {
                    color: #dc382d;
                }

                &.mysql {
                    color: #00758f;
                }

                &.mongo {
                    color: #13aa52;
                }

                &.postgres {
                    color: #336791;
                }
            }

            .tool-name {
                font-size: 12px;
                color: #adb5bd;
                text-align: center;
                transition: all 0.3s ease;
            }

            &:hover {
                .tool-icon {
                    transform: scale(1.1);
                }

                .tool-name {
                    color: #ffffff;
                }
            }
        }
    }
}
</style>