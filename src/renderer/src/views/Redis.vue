<template>
    <div class="redis-container">
        <div class="header">
            <div class="tabs" ref="operationTab">命令行</div>
            <div class="tabs">面板ui</div>
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
            <ToolsSidebar @toolSelect="handleToolSelect" />
        </div>
    </div>
</template>

<script setup>
// @ts-nocheck
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
// 侧边工具栏组件
import ToolsSidebar from '../components/ToolsSidebar.vue'
// Redis 常用命令列表
import { redisCommands } from '../constants/redisCommands'

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

// 添加工具选择处理函数
const handleToolSelect = (toolName) => {
    console.log(`Selected tool: ${toolName}`)
    // 这里可以添加工具切换的逻辑
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
}
</style>