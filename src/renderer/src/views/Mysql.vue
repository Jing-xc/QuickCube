<template>
    <div class="mysql-container">
        <div class="header">
            <div class="tabs" :class="{ active: activeTab === 'terminal' }" @click="switchTab('terminal')">命令行</div>
            <div class="tabs" :class="{ active: activeTab === 'ui' }" @click="switchTab('ui')">面板UI</div>
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
                        <div class="output-line">Welcome to MySQL Client Terminal</div>
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
            <div class="mysql-ui" v-show="activeTab === 'ui'">
                <MysqlUI :isConnected="isConnected" />
            </div>
            <ToolsSidebar />
        </div>
        <div class="context-menu" v-if="showContextMenu" :style="contextMenuPosition">
            <div class="menu-item" @click="copySelected">复制选中内容</div>
            <div class="menu-item" @click="copyCurrentLine">复制当前行</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ToolsSidebar from '../components/ToolsSidebar.vue'
import MysqlUI from '../components/MysqlUI.vue'
import { mysqlCommands } from '../constants/mysqlCommands'

const router = useRouter()
const ipcRenderer = window.electron.ipcRenderer

// 基础状态
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
const activeTab = ref('terminal')

// 右键菜单状态
const showContextMenu = ref(false)
const contextMenuPosition = ref({ top: '0px', left: '0px' })
const selectedText = ref('')
const currentLine = ref(null)

// 输出内容到终端
const appendOutput = (text, type = 'normal') => {
    const outputLine = document.createElement('pre')
    outputLine.className = `output-line ${type}`
    outputLine.style.margin = '0'
    outputLine.style.fontFamily = 'Consolas, monospace'
    outputLine.style.whiteSpace = 'pre'

    // 处理表格输出
    if (typeof text === 'object' && text.isTable) {
        outputLine.textContent = formatTableOutput(text.data)
    } else {
        outputLine.textContent = text
    }

    outputArea.value.appendChild(outputLine)
    nextTick(() => {
        outputArea.value.scrollTop = outputArea.value.scrollHeight
    })
}

// 格式化表格输出
const formatTableOutput = (data) => {
    if (!data || !data.length) return ''

    // 获取所有列
    const columns = Object.keys(data[0])

    // 计算每列的最大宽度
    const columnWidths = {}
    columns.forEach(col => {
        columnWidths[col] = Math.max(
            getStringWidth(col),
            ...data.map(row => {
                const value = row[col] === null || row[col] === undefined ? 'NULL' : String(row[col])
                return getStringWidth(value)
            })
        )
    })

    // 生成分隔线
    const makeSeparator = () => {
        let line = '+'
        columns.forEach(col => {
            line += '-'.repeat(columnWidths[col] + 2) + '+'
        })
        return line
    }

    // 生成表格内容
    let output = makeSeparator() + '\n'

    // 添加表头
    output += '|'
    columns.forEach(col => {
        const colWidth = getStringWidth(col)
        const padding = columnWidths[col] - colWidth
        const leftPad = Math.floor(padding / 2)
        const rightPad = padding - leftPad
        output += ' ' + ' '.repeat(leftPad) + col + ' '.repeat(rightPad) + ' |'
    })
    output += '\n' + makeSeparator() + '\n'

    // 添加数据行
    data.forEach(row => {
        output += '|'
        columns.forEach(col => {
            const value = row[col] === null || row[col] === undefined ? 'NULL' : String(row[col])
            const valueWidth = getStringWidth(value)
            const padding = columnWidths[col] - valueWidth
            const leftPad = Math.floor(padding / 2)
            const rightPad = padding - leftPad
            output += ' ' + ' '.repeat(leftPad) + value + ' '.repeat(rightPad) + ' |'
        })
        output += '\n'
    })

    output += makeSeparator() + '\n'
    return output
}

// 计算字符串显示宽度（考虑中文字符和特殊字符）
const getStringWidth = (str) => {
    return [...str].reduce((width, char) => {
        if (/[\u4e00-\u9fa5]/.test(char)) {
            return width + 2  // 中文字符宽度为2
        } else if (/[\uff00-\uffff]/.test(char)) {
            return width + 2  // 全角字符宽度为2
        } else {
            return width + 1  // 其他字符宽度为1
        }
    }, 0)
}

// 显示帮助信息
const showHelp = () => {
    appendOutput('Available Commands:', 'help')
    appendOutput('  connect <host> <user> <password> <database> - Connect to MySQL server', 'help')
    appendOutput('  connect                                     - Connect with default settings', 'help')
    appendOutput('  use <database>                             - Switch to database', 'help')
    appendOutput('  show databases                             - List available databases', 'help')
    appendOutput('  show tables                                - List tables in current database', 'help')
    appendOutput('  describe <table>                           - Show table structure', 'help')
    appendOutput('  disconnect                                 - Disconnect from MySQL server', 'help')
    appendOutput('  clear                                      - Clear terminal', 'help')
    appendOutput('  help                                       - Show this help message', 'help')
}

// 尝试默认连接
const tryDefaultConnect = async () => {
    try {
        const result = await ipcRenderer.invoke('mysql:connect', {
            host: '127.0.0.1',
            port: 3306,  // 添加默认端口
            user: 'root',
            password: '847047477',
            database: 'mysql'
        })

        if (result.success) {
            isConnected.value = true
            appendOutput('Successfully connected to local MySQL server', 'success')
        } else {
            appendOutput(`Connection failed: ${result.message}`, 'error')
            appendOutput('Please check:', 'system')
            appendOutput('1. MySQL 服务是否已启动', 'system')
            appendOutput('2. 端口是否为 3306（默认）', 'system')
            appendOutput('3. 用户名和密码是否正确', 'system')
        }
    } catch (error) {
        appendOutput(`连接错误: ${error.message}`, 'error')
        appendOutput('请确保 MySQL 服务已启动，并检查连接信息', 'system')
    }
}

// 清除终端
const clearTerminal = () => {
    while (outputArea.value.firstChild) {
        outputArea.value.removeChild(outputArea.value.firstChild)
    }
    appendOutput('Terminal cleared', 'system')
}

// 执行命令
const executeCommand = async () => {
    if (!currentCommand.value.trim()) return

    const command = currentCommand.value.trim()

    // 添加到命令历史
    commandHistory.value.push(command)
    if (commandHistory.value.length > 50) {
        commandHistory.value.shift()
    }
    currentHistoryIndex.value = -1

    appendOutput(`mysql> ${command}`)

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
            await ipcRenderer.invoke('mysql:disconnect')
            isConnected.value = false
            appendOutput('Disconnected from MySQL server', 'system')
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

            // 使用默认连接
            if (parts.length === 1) {
                await tryDefaultConnect()
                currentCommand.value = ''
                return
            }

            if (parts.length < 5) {
                appendOutput('Usage: connect <host> <user> <password> <database>', 'error')
                currentCommand.value = ''
                return
            }

            const [_, host, user, password, database] = parts
            const result = await ipcRenderer.invoke('mysql:connect', {
                host,
                user,
                password,
                database
            })

            if (result.success) {
                isConnected.value = true
                appendOutput(`Connected to MySQL server at ${host} successfully`, 'success')
            } else {
                appendOutput(`Connection failed: ${result.message}`, 'error')
            }
        } catch (error) {
            appendOutput(`Error: ${error.message}`, 'error')
        }
        currentCommand.value = ''
        return
    }

    // 检查连接状态
    if (!isConnected.value) {
        appendOutput('Not connected to MySQL server. Use "connect" command first.', 'error')
        appendOutput('Try "connect" to connect with default settings', 'system')
        currentCommand.value = ''
        return
    }

    // 执行MySQL命令
    try {
        const result = await ipcRenderer.invoke('mysql:execute', command)
        if (result.success) {
            if (Array.isArray(result.data)) {
                appendOutput({ isTable: true, data: result.data })
            } else {
                appendOutput(result.message || 'Query executed successfully', 'success')
            }
        } else {
            appendOutput(`Error: ${result.message}`, 'error')
        }
    } catch (error) {
        appendOutput(`Error: ${error.message}`, 'error')
        if (!isConnected.value) {
            appendOutput('Connection lost. Try reconnecting with "connect" command.', 'system')
        }
    }

    currentCommand.value = ''
    currentCommandHelp.value = null
}

// 命令历史导航
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

// 更新命令提示
const updateSuggestions = () => {
    if (!currentCommand.value) {
        showSuggestions.value = false
        return
    }

    const input = currentCommand.value.toLowerCase()
    const matchedCommands = Object.entries(mysqlCommands)
        .filter(([cmd]) => cmd.toLowerCase().startsWith(input))
        .slice(0, 5)
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
            ...mysqlCommands[command]
        }
        showSuggestions.value = false
        commandInput.value.focus()
    }
}

// 处理键盘导航和快捷键
const handleKeyDown = (e) => {
    if (showSuggestions.value) {
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

    // Ctrl+C 复制选中内容
    if (e.ctrlKey && e.key === 'c' && window.getSelection().toString()) {
        navigator.clipboard.writeText(window.getSelection().toString())
    }
}

// 处理输入更新
const handleInput = () => {
    const command = currentCommand.value.trim().split(' ')[0].toLowerCase()
    if (command && mysqlCommands[command]) {
        currentCommandHelp.value = {
            command,
            ...mysqlCommands[command]
        }
    } else {
        currentCommandHelp.value = null
    }
    updateSuggestions()
}

// 切换标签页
const switchTab = (tab) => {
    activeTab.value = tab
}

// 工具选择处理
const handleToolSelect = (toolName) => {
    if (toolName !== 'mysql') {
        router.push(`/${toolName}`)
    }
}

// 监听命令输入
watch(currentCommand, () => {
    updateSuggestions()
})

// 监听命令帮助显示状态
watch(currentCommandHelp, () => {
    nextTick(() => {
        if (outputArea.value) {
            outputArea.value.scrollTop = outputArea.value.scrollHeight
        }
    })
}, { flush: 'post' })

// 监听建议列表显示状态
watch(showSuggestions, () => {
    nextTick(() => {
        if (outputArea.value) {
            outputArea.value.scrollTop = outputArea.value.scrollHeight
        }
    })
}, { flush: 'post' })

// 处理右键菜单
const handleContextMenu = (e) => {
    // 检查是否在输出区域内
    if (!outputArea.value.contains(e.target)) {
        showContextMenu.value = false
        return
    }

    e.preventDefault()
    showContextMenu.value = true
    contextMenuPosition.value = {
        top: `${e.clientY}px`,
        left: `${e.clientX}px`
    }

    // 获取当前行
    currentLine.value = e.target.closest('.output-line')

    // 获取选中的文本
    selectedText.value = window.getSelection().toString()
}

// 复制选中内容
const copySelected = () => {
    if (selectedText.value) {
        navigator.clipboard.writeText(selectedText.value)
        showContextMenu.value = false
    }
}

// 复制当前行
const copyCurrentLine = () => {
    if (currentLine.value) {
        navigator.clipboard.writeText(currentLine.value.textContent)
        showContextMenu.value = false
    }
}

// 点击其他地方关闭菜单
const handleClick = (e) => {
    if (!e.target.closest('.context-menu')) {
        showContextMenu.value = false
    }
}

onMounted(() => {
    commandInput.value.focus()
    showHelp()
    // 尝试默认连接
    tryDefaultConnect()
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    document.removeEventListener('contextmenu', handleContextMenu)
    document.removeEventListener('click', handleClick)
    document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped lang="scss">
.mysql-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1a1d21;
    overflow: hidden;

    .header {
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 20px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        flex-shrink: 0;

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
                    background: linear-gradient(90deg, #2196F3, #03A9F4);
                }
            }
        }
    }

    .main-content {
        display: flex;
        flex: 1;
        position: relative;
        height: calc(100vh - 40px);
        overflow: hidden;
        min-width: 0;

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

                &::before {
                    background-color: #dc3545;
                    box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
                    animation: redPulse 2s infinite;
                }

                &::after {
                    background-color: #2196F3;
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
                        box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
                        animation: bluePulse 2s infinite;
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

            @keyframes bluePulse {
                0% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
                }

                70% {
                    transform: scale(1.2);
                    box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
                }

                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
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
                            color: #2196F3;
                            font-weight: bold;
                            padding: 4px 8px;
                            background: rgba(33, 150, 243, 0.1);
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
                            color: #03A9F4;
                            font-family: 'Consolas', monospace;
                            padding: 8px 12px;
                            background: rgba(33, 150, 243, 0.1);
                            border-radius: 4px;
                            border-left: 3px solid #2196F3;
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
                user-select: text;
                cursor: text;

                .output-line {
                    white-space: pre;
                    font-family: 'Consolas', monospace;
                    line-height: 1.5;
                    padding: 2px 0;

                    &::selection {
                        background: rgba(33, 150, 243, 0.3);
                        color: #ffffff;
                    }

                    &::-moz-selection {
                        background: rgba(33, 150, 243, 0.3);
                        color: #ffffff;
                    }
                }

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
                        background-color: #2196F3;
                        box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
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
                                background: rgba(33, 150, 243, 0.1);
                            }

                            .suggestion-content {
                                .command-line {
                                    margin-bottom: 4px;

                                    .command {
                                        color: #2196F3;
                                        margin-right: 10px;
                                    }

                                    .description {
                                        color: #adb5bd;
                                        font-size: 12px;
                                    }
                                }

                                .example {
                                    color: #03A9F4;
                                    font-size: 12px;
                                    font-family: 'Consolas', monospace;
                                }
                            }
                        }
                    }
                }
            }
        }

        .mysql-ui {
            flex: 1;
            display: flex;
            min-width: 0;
            overflow: hidden;
        }

        .tools-sidebar {
            width: 80px;
            flex-shrink: 0;
        }
    }
}

.context-menu {
    position: fixed;
    background: #2a2d31;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 4px 0;
    min-width: 150px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);

    .menu-item {
        padding: 8px 12px;
        cursor: pointer;
        color: #e4e4e4;
        font-size: 14px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;

        &:hover {
            background: rgba(33, 150, 243, 0.1);
        }

        &:active {
            background: rgba(33, 150, 243, 0.2);
        }
    }
}
</style>