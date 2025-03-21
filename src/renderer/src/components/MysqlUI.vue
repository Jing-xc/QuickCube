<template>
    <div class="mysql-ui-container">
        <div class="toolbars">
            <div class="toolbar-item" @click="addConnection">
                <img class="toolbar-item-icon" src="../assets/link.svg">
                <text class="toolbar-item-text">链接</text>
            </div>
            <div class="toolbar-item" @click="deleteConnection">
                <img class="toolbar-item-icon" src="../assets/delete.svg">
                <text class="toolbar-item-text">删除</text>
            </div>
            <div class="toolbar-item" @click="toggleCommandInput">
                <img class="toolbar-item-icon" src="../assets/add-search.svg">
                <text class="toolbar-item-text">查询</text>
            </div>
            <div class="toolbar-item" @click="openFilterDialog">
                <img class="toolbar-item-icon" src="../assets/search.svg">
                <text class="toolbar-item-text">筛选</text>
            </div>
            <div class="toolbar-item" @click="openImportDialog">
                <img class="toolbar-item-icon" src="../assets/import.svg">
                <text class="toolbar-item-text">导入</text>
            </div>
        </div>

        <div class="ui-container" v-loading="isLoading" element-loading-background="rgba(122, 122, 122, 0.2)">
            <div class="sidebar">
                <div class="connections">
                    <div v-for="conn in connections" :key="conn.id" class="connection-items">
                        <div class="connection-item">
                            <div class="connection-item-inner" @click="selectConnection(conn)">
                                <img class="connection-item-icon" src="../assets/mysql.svg">
                                <text v-if="currentConnection?.id === conn.id" class="connection-item-text connect">
                                    {{ conn.name }}
                                </text>
                                <text v-else class="connection-item-text">
                                    {{ conn.name }}
                                </text>
                            </div>

                            <img class="connection-item-icon" src="../assets/open.svg" style="width: 12px;height: 12px;"
                                v-if="currentConnection?.id === conn.id" @click="closeConnection">
                        </div>
                        <!-- 展示数据库列表 -->
                        <div class="databases" v-if="currentConnection?.id === conn.id">
                            <div v-for="db in databases" :key="db" class="database-items">
                                <div class="database-item">
                                    <div class="database-item-inner" @click="fetchTables(db)">
                                        <img class="database-item-icon" src="../assets/database.svg">
                                        <text v-if="currentDatabase === db" class=" database-item-text connect">
                                            {{ db }}
                                        </text>
                                        <text v-else class=" database-item-text">
                                            {{ db }}
                                        </text>
                                    </div>

                                    <img class="close" src="../assets/close.svg" v-if="currentDatabase === db"
                                        @click="currentDatabase = ''">
                                </div>
                                <!-- 添加表的展示 -->
                                <div class="tables" v-if="currentDatabase === db">
                                    <div v-for="table in tables" :key="table" class="table-items"
                                        @click="handleTableChange(table)">
                                        <div class="table-item">
                                            <img class="table-item-icon" src="../assets/table.svg">
                                            <text class="table-item-text">{{ table }}</text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="content-center">
                <!-- 添加命令输入区域 -->
                <div class="command-input-container" v-if="showCommandInput">
                    <div class="input-wrapper">
                        <textarea v-model="commandInput" @keyup.ctrl.enter="executeCommand" @input="handleInput"
                            placeholder="输入 SQL 命令... (Ctrl + Enter 执行)" class="command-input"></textarea>
                        <div class="suggestions" v-if="showSuggestions">
                            <div v-for="keyword in suggestions" :key="keyword" class="suggestion-item"
                                @click="selectSuggestion(keyword)">
                                {{ keyword }}
                            </div>
                        </div>
                    </div>
                    <button @click="executeCommand" class="execute-btn">执行</button>
                    <button @click="exportToExcel" class="execute-btn" style="background: #4fb40b;">导出</button>
                </div>
                <div class="table-container">
                    <table v-if="columns.length > 0">
                        <thead>
                            <tr>
                                <th v-for="column in columns" :key="column['字段名']">{{ column['字段名'] }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, index) in tableData" :key="index">
                                <td v-for="column in columns" :key="column.Field">{{ row[column['字段名']] }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else class="no-data" style="text-align: center; padding: 20px; color: #ddd;">
                        暂无数据
                    </div>
                </div>
                <div class="sqls">{{ sqls }}</div>
                <div class=" pagination-container">
                    <div class="pagination">
                        <button @click="prevPage" :disabled="currentPage === 1" class="page-btn">
                            上一页
                        </button>
                        <span class="page-info">
                            第 {{ currentPage }} 页
                        </span>
                        <button @click="nextPage" class="page-btn">
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="filter-dialog" v-if="showFilterDialog">
            <div class="filter-dialog-content">
                <div class="filter-dialog-header">
                    <h3>筛选条件</h3>
                </div>
                <div class="filter-dialog-body">
                    <div v-for="column in columns" :key="column['字段名']" class="filter-item">
                        <label>
                            <input type="checkbox" :value="column['字段名']"
                                v-model="selectedColumns[column['字段名']].enabled">
                            {{ column['字段名'] }}
                        </label>
                        <div class="filter-select-container">
                            <select class="filter-select" v-model="selectedColumns[column['字段名']].operator">
                                <option value="=">=</option>
                                <option value="!=">≠</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<">&lt;</option>
                                <option value="<=">&lt;=</option>
                                <option value="LIKE">包含</option>
                                <option value="NOT LIKE">不包含</option>
                            </select>
                            <input placeholder="输入筛选值..." class="filter-input"
                                v-model="selectedColumns[column['字段名']].value" />
                        </div>

                    </div>
                </div>
                <div class="filter-dialog-footer">
                    <button @click="applyFilter" class="apply-btn">应用</button>
                    <button @click="showFilterDialog = false" class="cancel-btn">取消</button>
                </div>
            </div>
        </div>
        <!-- 添加新的连接配置弹窗 -->
        <div class="connection-dialog" v-if="showConnectionDialog">
            <div class="connection-dialog-content">
                <div class="connection-dialog-header">
                    <h3>新增连接</h3>
                </div>
                <div class="connection-dialog-body">
                    <div class="form-item">
                        <label>连接名称</label>
                        <input v-model="newConnection.name" placeholder="请输入连接名称">
                    </div>
                    <div class="form-item">
                        <label>主机地址</label>
                        <input v-model="newConnection.host" placeholder="请输入主机地址">
                    </div>
                    <div class="form-item">
                        <label>端口</label>
                        <input v-model="newConnection.port" type="number" placeholder="请输入端口号">
                    </div>
                    <div class="form-item">
                        <label>用户名</label>
                        <input v-model="newConnection.user" placeholder="请输入用户名">
                    </div>
                    <div class="form-item">
                        <label>密码</label>
                        <input v-model="newConnection.password" type="password" placeholder="请输入密码">
                    </div>
                    <div class="form-item">
                        <label>数据库</label>
                        <input v-model="newConnection.database" placeholder="请输入默认数据库">
                    </div>
                </div>
                <div class="connection-dialog-footer">
                    <button @click="saveConnection" class="save-btn">保存</button>
                    <button @click="showConnectionDialog = false" class="cancel-btn">取消</button>
                </div>
            </div>
        </div>
        <!-- 导入excel -->
        <div class="import-dialog" v-if="showImportDialog">
            <div class="import-dialog-content">
                <div class="import-dialog-header">
                    <h3>导入Excel数据</h3>
                </div>
                <div class="import-dialog-body">
                    <div class="form-item">
                        <label>选择目标数据库</label>
                        <select v-model="importConfig.database">
                            <option v-for="db in databases" :key="db" :value="db">{{ db }}</option>
                        </select>
                    </div>
                    <div class="form-item">
                        <label>表名</label>
                        <input v-model="importConfig.tableName" placeholder="请输入要创建的表名">
                    </div>
                    <div class="form-item">
                        <label>选择Excel文件</label>
                        <div class="file-input">
                            <button @click="selectExcelFile">选择文件</button>
                            <span>{{ importConfig.fileName || '未选择文件' }}</span>
                        </div>
                    </div>
                </div>
                <div class="import-dialog-footer">
                    <button @click="importExcel" class="import-btn" :disabled="!importConfig.filePath">导入</button>
                    <button @click="showImportDialog = false" class="cancel-btn">取消</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
const ipcRenderer = window.electron.ipcRenderer

// 状态管理
const databases = ref([])
const tables = ref([])
const columns = ref([])
const tableData = ref([])
const currentDatabase = ref('')
const currentTable = ref('')
const isLoading = ref(false)
const currentPage = ref(1);
const pageSize = ref(1000);
const sqls = ref('');
const showFilterDialog = ref(false)
const selectedColumns = ref({})
const currentConnection = ref(null)
const showConnectionDialog = ref(false)
const newConnection = ref({
    name: '',
    host: '',
    port: 3306,
    user: '',
    password: '',
    database: 'mysql'
})

const showCommandInput = ref(false)
const commandInput = ref('')

const suggestions = ref([])
const showSuggestions = ref(false)
const cursorPosition = ref(0)
const showImportDialog = ref(false)
const importConfig = ref({
    database: '',
    tableName: '',
    filePath: '',
    fileName: ''
})

// MySQL 关键字列表
const mysqlKeywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'LEFT JOIN',
    'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
    'CREATE', 'ALTER', 'DROP', 'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'TRIGGER',
    'PROCEDURE', 'FUNCTION', 'CONSTRAINT', 'PRIMARY KEY', 'FOREIGN KEY',
    'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'AND', 'OR', 'NOT', 'IN',
    'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL'
]

// 打开导入对话框
const openImportDialog = () => {
    if (!currentConnection.value) {
        ElMessage({
            message: '请先选择一个数据库连接',
            type: 'warning',
            duration: 2000
        })
        return
    }
    showImportDialog.value = true
    importConfig.value = {
        database: currentDatabase.value,
        tableName: '',
        filePath: '',
        fileName: ''
    }
}

// 选择Excel文件
const selectExcelFile = async () => {
    try {
        const result = await ipcRenderer.invoke('dialog:openFile')
        if (!result.success) {
            ElMessage({
                message: '选择文件失败：' + result.message,
                type: 'error',
                duration: 2000
            })
            return
        }

        if (result.canceled) {
            return
        }

        importConfig.value.filePath = result.filePaths[0]
        importConfig.value.fileName = result.filePaths[0].split('\\').pop()
    } catch (error) {
        ElMessage({
            message: '选择文件失败：' + error.message,
            type: 'error',
            duration: 2000
        })
    }
}

// 导入Excel
const importExcel = async () => {
    if (!importConfig.value.database || !importConfig.value.tableName || !importConfig.value.filePath) {
        ElMessage({
            message: '请填写完整信息',
            type: 'warning',
            duration: 2000
        })
        return
    }

    try {
        isLoading.value = true
        // 创建一个新的对象，只包含必要的连接信息
        const connectionConfig = {
            host: currentConnection.value.host,
            port: currentConnection.value.port,
            user: currentConnection.value.user,
            password: currentConnection.value.password
        }

        const result = await ipcRenderer.invoke('mysql:importExcel', {
            filePath: importConfig.value.filePath,
            database: importConfig.value.database,
            tableName: importConfig.value.tableName,
            connection: connectionConfig
        })

        if (result.success) {
            ElMessage({
                message: '导入成功',
                type: 'success',
                duration: 2000
            })
            showImportDialog.value = false
            // 刷新表列表
            await fetchTables(importConfig.value.database)
        } else {
            ElMessage({
                message: '导入失败：' + result.message,
                type: 'error',
                duration: 2000
            })
        }
    } catch (error) {
        ElMessage({
            message: '导入失败：' + error.message,
            type: 'error',
            duration: 2000
        })
    } finally {
        isLoading.value = false
    }
}

const exportToExcel = async () => {
    if (!tableData.value || tableData.value.length === 0) {
        ElMessage({
            message: '没有可导出的数据',
            type: 'warning',
            duration: 2000
        })
        return
    }

    try {
        isLoading.value = true
        // 处理数据，确保所有值都是可序列化的
        const processedData = tableData.value.map(row => {
            const newRow = {}
            columns.value.forEach(col => {
                const value = row[col['字段名']]
                // 处理特殊类型的值
                newRow[col['字段名']] = value === null ? ''
                    : typeof value === 'object' ? (
                        // 如果是对象或数组，尝试保持 JSON 格式
                        Array.isArray(value) || Object.keys(value).length > 0
                            ? JSON.stringify(value, null, 2)  // 格式化 JSON 字符串
                            : String(value)
                    )
                        : String(value)
            })
            return newRow
        })
        const result = await ipcRenderer.invoke('mysql:exportExcel', {
            data: processedData,
            columns: columns.value.map(col => col['字段名']),
            tableName: currentTable.value || 'export'
        })

        if (result.success) {
            ElMessage({
                message: '导出成功：' + result.filePath,
                type: 'success',
                duration: 2000
            })
        } else {
            ElMessage({
                message: '导出失败：' + result.message,
                type: 'error',
                duration: 2000
            })
        }
    } catch (error) {
        ElMessage({
            message: '导出失败：' + error.message,
            type: 'error',
            duration: 2000
        })
    } finally {
        isLoading.value = false
    }
}

// 处理输入事件
const handleInput = (event) => {
    const textarea = event.target
    cursorPosition.value = textarea.selectionStart
    const text = commandInput.value
    const lastWord = text.slice(0, cursorPosition.value).split(/\s/).pop()

    if (lastWord && lastWord.length >= 1) {
        suggestions.value = mysqlKeywords.filter(keyword =>
            keyword.toLowerCase().startsWith(lastWord.toLowerCase())
        )
        showSuggestions.value = suggestions.value.length > 0
    } else {
        showSuggestions.value = false
    }
}

// 选择提示词
const selectSuggestion = (keyword) => {
    const text = commandInput.value
    const words = text.slice(0, cursorPosition.value).split(/\s/)
    words.pop()
    const beforeText = words.join(' ') + (words.length > 0 ? ' ' : '')
    const afterText = text.slice(cursorPosition.value)

    commandInput.value = beforeText + keyword + ' ' + afterText
    showSuggestions.value = false
}

// 添加新的方法
const toggleCommandInput = () => {
    showCommandInput.value = !showCommandInput.value
}

const executeCommand = async () => {
    if (!commandInput.value.trim()) return

    try {
        isLoading.value = true
        sqls.value = commandInput.value
        const result = await ipcRenderer.invoke('mysql:execute', commandInput.value)
        if (result.success) {
            // 使用第一条数据的key作为表头
            if (result.data && result.data.length > 0) {
                columns.value = Object.keys(result.data[0]).map(key => ({ '字段名': key }))
            }
            tableData.value = result.data
            ElMessage({
                message: '执行成功',
                type: 'success',
                duration: 2000
            })
        } else {
            ElMessage({
                message: '执行失败：' + result.message,
                type: 'error',
                duration: 2000
            })
        }
    } catch (error) {
        ElMessage({
            message: '执行失败：' + error.message,
            type: 'error',
            duration: 2000
        })
    } finally {
        isLoading.value = false
    }
}

// 初始化时从localStorage加载保存的连接
onMounted(() => {
    const savedConnections = localStorage.getItem('mysql-connections')
    if (savedConnections) {
        const parsedConnections = JSON.parse(savedConnections)
        const hasDefaultConnection = parsedConnections.some(conn => conn.id === 'default')
        if (hasDefaultConnection) {
            connections.value = parsedConnections
        } else {
            connections.value = [
                connections.value[0],
                ...parsedConnections
            ]
        }
    }
})

// 数据库连接列表,默认只有本地链接
const connections = ref([
    {
        id: 'default',
        name: 'localhost',
        host: '127.0.0.1',
        port: 3306,  // 添加默认端口
        user: 'root',
        password: '847047477',
        database: 'mysql'
    }
])

// 选择连接
const selectConnection = async (connection) => {
    currentConnection.value = connection
    // 尝试连接并获取数据库列表
    try {
        isLoading.value = true
        // 添加1秒延迟用于测试
        //await new Promise(resolve => setTimeout(resolve, 1000))
        const { host, port, user, password, database } = connection;
        const result = await ipcRenderer.invoke('mysql:connect', { host, port, user, password, database })
        if (result.success) {
            await fetchDatabases()
        } else {
            ElMessage({
                message: '连接失败：' + result.message,
                type: 'error',
                duration: 2000
            });
        }
    } catch (error) {
        ElMessage({
            message: '连接失败：' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false
    }
}

//关闭链接
const closeConnection = async () => {
    try {
        isLoading.value = true
        //await new Promise(resolve => setTimeout(resolve, 1000))
        const { host, port, user, password } = currentConnection.value;
        const result = await ipcRenderer.invoke('mysql:disconnect', { host, port, user, password, database: currentDatabase.value })
        databases.value = [];
        currentDatabase.value = '';
        tables.value = [];
        columns.value = [];
        tableData.value = [];
        currentTable.value = '';
        sqls.value = '';
        selectedColumns.value = {};
        currentConnection.value = null;
        ElMessage({
            message: '关闭成功',
            type: 'success',
            duration: 2000
        });
    } catch (error) {
        ElMessage({
            message: '关闭失败：' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false
    }
}

//新增链接
const addConnection = async () => {
    showConnectionDialog.value = true
    newConnection.value = {
        name: '',
        host: '',
        port: 3306,
        user: '',
        password: '',
        database: 'mysql'
    }
}

// 保存新连接
const saveConnection = () => {
    // 验证必填字段
    if (!newConnection.value.name || !newConnection.value.host ||
        !newConnection.value.user || !newConnection.value.password) {
        ElMessage({
            message: '请填写完整的连接信息',
            type: 'warning',
            duration: 2000
        })
        return
    }

    // 生成唯一ID
    const id = Date.now().toString()

    // 添加新连接到连接列表
    connections.value.push({
        id,
        ...newConnection.value
    })

    // 保存到localStorage
    localStorage.setItem('mysql-connections', JSON.stringify(connections.value))

    // 关闭弹窗
    showConnectionDialog.value = false

    ElMessage({
        message: '添加连接成功',
        type: 'success',
        duration: 2000
    })
}

// 删除连接
const deleteConnection = async () => {
    // 如果没有选中的连接，提示用户
    if (!currentConnection.value) {
        ElMessage({
            message: '请先选择要删除的连接',
            type: 'warning',
            duration: 2000
        })
        return
    }

    // 如果是默认连接，不允许删除
    if (currentConnection.value.id === 'default') {
        ElMessage({
            message: '默认连接不能删除',
            type: 'warning',
            duration: 2000
        })
        return
    }

    try {
        // 如果连接是打开状态，先关闭连接
        let connId = currentConnection.value.id
        if (currentConnection.value) {
            await closeConnection()
        }

        connections.value = connections.value.filter(conn => conn.id !== connId)

        // 更新 localStorage
        localStorage.setItem('mysql-connections', JSON.stringify(connections.value))

        // 重置当前连接
        currentConnection.value = null
        ElMessage({
            message: '删除连接成功',
            type: 'success',
            duration: 2000
        })
    } catch (error) {
        ElMessage({
            message: '删除连接失败：' + error.message,
            type: 'error',
            duration: 2000
        })
    }
}

// 获取数据库列表
const fetchDatabases = async () => {
    try {
        isLoading.value = true // 开始加载
        const result = await ipcRenderer.invoke('mysql:execute', 'SHOW DATABASES')
        if (result.success) {
            databases.value = result.data.map(row => row['数据库名'])
        } else {
            ElMessage({
                message: '获取列表失败:' + result.message,
                type: 'error',
                duration: 2000
            });
        }
    } catch (error) {
        ElMessage({
            message: '获取列表失败:' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false // 结束加载
    }
}

// 获取表格列表
const fetchTables = async (db) => {
    currentDatabase.value = db
    try {
        isLoading.value = true // 开始加载
        await ipcRenderer.invoke('mysql:execute', `USE ${db}`)

        const result = await ipcRenderer.invoke('mysql:execute', `SHOW TABLES FROM ${currentDatabase.value}`)
        if (result.success) {
            tables.value = result.data.map(row => Object.values(row)[0])
        } else {
            ElMessage({
                message: '获取列表失败:' + result.message,
                type: 'error',
                duration: 2000
            });
        }
    } catch (error) {
        ElMessage({
            message: '获取列表失败:' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false // 结束加载
    }
}

// 处理表格切换
const handleTableChange = async (table) => {
    currentTable.value = table;
    await fetchColumns()
    let sql = `SELECT * FROM ${currentDatabase.value}.${currentTable.value}`;
    await fetchTableData(sql)
}

// 获取表结构
const fetchColumns = async () => {
    if (!currentTable.value) return
    try {
        isLoading.value = true // 开始加载
        const result = await ipcRenderer.invoke('mysql:execute', `DESCRIBE ${currentDatabase.value}.${currentTable.value}`)
        if (result.success) {
            columns.value = result.data
        } else {
            ElMessage({
                message: '获取表结构失败:' + result.message,
                type: 'error',
                duration: 2000
            });
        }
    } catch (error) {
        ElMessage({
            message: '获取表结构失败:' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false // 结束加载
    }
}

// 获取表数据
const fetchTableData = async (sql) => {
    if (!currentTable.value) return
    try {
        isLoading.value = true // 开始加载
        sqls.value = sql + ` LIMIT ${pageSize.value} OFFSET ${(currentPage.value - 1) * pageSize.value}`
        const result = await ipcRenderer.invoke('mysql:execute', sqls.value)
        if (result.success) {
            tableData.value = result.data
        } else {
            ElMessage({
                message: '获取表数据失败:' + result.message,
                type: 'error',
                duration: 2000
            });
        }
    } catch (error) {
        ElMessage({
            message: '获取表数据失败:' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false // 结束加载
    }
}

const nextPage = () => {
    currentPage.value++
    // 获取sql语句中LIMIT之前的部分
    let baseSQL = sqls.value.split(' LIMIT')[0];
    // 重新执行查询
    fetchTableData(baseSQL);
}

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        // 获取sql语句中LIMIT之前的部分
        let baseSQL = sqls.value.split(' LIMIT')[0];
        // 重新执行查询
        fetchTableData(baseSQL);
    }
}
//打开筛选框
const openFilterDialog = () => {

    // 判断是否选中表
    if (columns.value.length === 0) {
        ElMessage({
            message: '请先选择一个表',
            type: 'warning',
            duration: 2000
        });
        return;
    }

    // 判断selectedColumns是否为空
    if (Object.keys(selectedColumns.value).length === 0) {
        // 如果为空,初始化selectedColumns
        columns.value.forEach(column => {
            selectedColumns.value[column['字段名']] = {
                enabled: false,
                operator: '=',
                value: ''
            };
        })
    }
    showFilterDialog.value = true;
}

// 应用筛选
const applyFilter = async () => {

    let whereClause = [];

    // 遍历所有选中的列构建 WHERE 子句
    Object.entries(selectedColumns.value).forEach(([column, filter]) => {
        if (filter.enabled && filter.value) {
            if (filter.operator === 'LIKE' || filter.operator === 'NOT LIKE') {
                whereClause.push(`${column} ${filter.operator} '%${filter.value}%'`);
            } else {
                whereClause.push(`${column} ${filter.operator} '${filter.value}'`);
            }
        }
    });

    // 构建完整的 SQL 查询
    let sql = `SELECT * FROM ${currentDatabase.value}.${currentTable.value}`;
    if (whereClause.length > 0) {
        sql += ` WHERE ${whereClause.join(' AND ')}`;
    }
    fetchTableData(sql);
    // 关闭筛选对话框
    showFilterDialog.value = false;
}
</script>

<style scoped lang="scss">
.mysql-ui-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .toolbars {
        width: 100%;
        height: 60px;
        background: linear-gradient(to right, #6d737a, #282e2d);
        display: flex;
        align-items: center;
        flex-shrink: 0;

        .toolbar-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 50px;
            width: 50px;
            margin: 3px 10px;
            cursor: pointer;
            transform: scale(0.9);

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
                transform: scale(1.0);
            }

            .toolbar-item-icon {
                width: 30px;
                height: 30px;
                margin-top: 3px;
            }

            .toolbar-item-text {
                color: #ddd;
                font-size: 12px;

                /* 由于 .toolbar-item-text 是一个独立的元素，
                   需要将 hover 效果放在父元素 .toolbar-item 下 */
                &:hover {
                    color: #fff;
                }
            }
        }
    }



    .ui-container {
        flex: 1;
        min-height: 0;
        display: flex;
        overflow: hidden;

        .sidebar {
            width: 200px;
            flex-shrink: 0;
            overflow-y: auto;
            overflow-x: hidden;

            /* 自定义滚动条样式 */
            &::-webkit-scrollbar {
                width: 3px;
                height: 3px;
            }

            &::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
            }

            &::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;

                &:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            }

            background: linear-gradient(to right, #6d737a, #282e2d);
            color: #fff;
            /* 设置盒模型的计算方式为 border-box
               这样 padding 和 border 的尺寸会包含在元素的总宽高中
               而不会额外增加元素的实际占用空间 */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;

            .connections {
                margin-bottom: 20px;

                .connection-items {
                    display: flex;
                    flex-direction: column;

                    .connection-item {
                        height: 25px;
                        width: calc(100% - 20px);
                        margin: 5px 10px;
                        cursor: pointer;
                        display: flex;
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;

                        &:hover {
                            background: rgba(255, 255, 255, 0.1);
                        }

                        .connection-item-inner {
                            display: flex;
                            flex-direction: row;
                            justify-content: center;
                            align-items: center;

                            .connection-item-icon {
                                height: 20px;
                                width: 20px;
                                margin-left: 10px;
                            }

                            .connection-item-text {
                                font-size: 12px;
                                color: #ddd;

                                &:hover {
                                    color: #fff;
                                }
                            }

                            .connect {
                                font-size: 12px;
                                color: #3fd11a;

                                &:hover {
                                    color: #3fd11a;
                                }
                            }
                        }


                    }

                    .databases {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        margin-left: 10px;
                        width: 100%;

                        .database-items {
                            display: flex;
                            flex-direction: column;
                            width: 100%;

                            .database-item {
                                height: 25px;
                                width: calc(100% - 20px);
                                padding: 5px 0;
                                cursor: pointer;
                                display: flex;
                                flex-direction: row;
                                justify-content: space-between;
                                align-items: center;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;

                                &:hover {
                                    background: rgba(255, 255, 255, 0.1);
                                }

                                .close {
                                    width: 12px;
                                    height: 12px;
                                }

                                .database-item-inner {
                                    display: flex;
                                    flex-direction: row;
                                    justify-content: center;
                                    align-items: center;

                                    .database-item-icon {
                                        height: 20px;
                                        width: 20px;
                                        margin-left: 10px;
                                    }



                                    .database-item-text {
                                        font-size: 12px;
                                        color: #ddd;
                                        margin-left: 5px;
                                        white-space: nowrap;
                                        overflow: hidden;
                                        text-overflow: ellipsis;


                                        &:hover {
                                            color: #fff;
                                        }
                                    }

                                    .connect {
                                        font-size: 12px;
                                        color: #3fd11a;

                                        &:hover {
                                            color: #3fd11a;
                                        }
                                    }
                                }


                            }

                            .tables {
                                display: flex;
                                flex-direction: column;
                                align-items: flex-start;
                                margin-left: 30px;

                                .table-items {
                                    display: flex;
                                    flex-direction: column;

                                    .table-item {
                                        height: 25px;
                                        width: 100%;
                                        padding: 5px 0;
                                        cursor: pointer;
                                        display: flex;
                                        flex-direction: row;
                                        justify-content: flex-start;
                                        align-items: center;
                                        white-space: nowrap;
                                        overflow: hidden;
                                        text-overflow: ellipsis;

                                        &:hover {
                                            background: rgba(255, 255, 255, 0.1);
                                        }

                                        .table-item-icon {
                                            height: 16px;
                                            width: 16px;
                                        }

                                        .table-item-text {
                                            margin-left: 5px;
                                            white-space: nowrap;
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                            font-size: 12px;
                                            color: #ddd;

                                            &:hover {
                                                color: #fff;
                                            }
                                        }

                                        .connect {
                                            font-size: 12px;
                                            color: #3fd11a;

                                            &:hover {
                                                color: #3fd11a;
                                            }
                                        }
                                    }
                                }

                            }
                        }
                    }
                }
            }
        }

        .content-center {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-image: url('../assets/wavy-lines.svg');
            background-size: cover;
            background-position: center;
            padding: 10px;
            box-sizing: border-box;

            .command-input-container {
                margin: 10px 0;
                display: flex;
                gap: 10px;


                .execute-btn {
                    padding: 0 15px;
                    height: 30px; // 设置与input相同的高度
                    border: none;
                    border-radius: 4px;
                    background: #1a73e8;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;

                    &:hover {
                        background: #1557b0;
                    }
                }


                .input-wrapper {
                    position: relative;
                    flex: 1;

                    .command-input {
                        padding: 8px;
                        height: 30px;
                        width: 100%;
                        border: none;
                        border-radius: 4px;
                        background: rgba(255, 255, 255, 0.1);
                        color: #56b0ec;
                        font-size: 12px;
                        outline: none;
                        resize: vertical;

                        &:focus {
                            background: rgba(255, 255, 255, 0.15);
                        }
                    }



                    .suggestions {
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        max-height: 200px;
                        overflow-y: auto;
                        background: #2c3033;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                        z-index: 1000;

                        .suggestion-item {
                            padding: 8px 12px;
                            color: #ddd;
                            font-size: 12px;
                            cursor: pointer;

                            &:hover {
                                background: rgba(255, 255, 255, 0.1);
                                color: #56b0ec;
                            }
                        }

                        &::-webkit-scrollbar {
                            width: 3px;
                            height: 3px;
                        }

                        &::-webkit-scrollbar-track {
                            background: rgba(0, 0, 0, 0.1);
                            border-radius: 3px;
                        }

                        &::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 3px;

                            &:hover {
                                background: rgba(255, 255, 255, 0.3);
                            }
                        }
                    }
                }
            }

            .sqls {
                height: 25px;
                width: 100%;
                padding: 15px 0 5px;
                cursor: pointer;
                font-size: 12px;
                color: #dddd;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: flex;
                justify-content: flex-start;
                align-items: center;

                &:hover {
                    color: #139dec;
                }
            }

            .pagination-container {
                padding: 5px;
                margin-top: 5px;
                border-radius: 4px;

                .pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;

                    .page-btn {
                        padding: 2px 5px;
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 4px;
                        color: #ddd;
                        cursor: pointer;
                        font-size: 11px;

                        &:hover {
                            background: rgba(255, 255, 255, 0.2);
                        }

                        &:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                        }
                    }

                    .page-info {
                        color: #ddd;
                        font-size: 11px;
                    }
                }
            }

            .table-container {
                flex: 1;
                min-height: 0;
                overflow: auto;

                /* 自定义滚动条样式 */
                &::-webkit-scrollbar {
                    width: 3px;
                    height: 3px;
                }

                &::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }

                &::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;

                    &:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }
                }

                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;

                table {
                    width: max-content;
                    min-width: 100%;
                    border-collapse: collapse;
                    color: #ddd;

                    th,
                    td {
                        padding: 8px 16px;
                        text-align: left;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        min-width: 100px;
                        white-space: nowrap;
                    }

                    th {
                        background: #000;
                        position: sticky;
                        top: 0;
                        z-index: 1;
                        font-size: 12px;
                        font-weight: bold;
                        color: #d5e2c0;

                        &:hover {
                            background: rgba(0, 0, 0, 0.3);
                        }
                    }

                    td {
                        font-size: 12px;
                        color: #ddd;

                        &:hover {
                            background: rgba(255, 255, 255, 0.05);
                        }
                    }

                    tbody {}

                    tbody tr:hover {
                        background: rgba(255, 255, 255, 0.05);
                    }
                }
            }
        }
    }

    .filter-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;

        .filter-dialog-content {
            background: #2c3033;
            border-radius: 8px;
            width: 500px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;

            .filter-dialog-header {
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                h3 {
                    margin: 0;
                    color: #ddd;
                    font-size: 16px;
                }

                .close-icon {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    opacity: 0.7;

                    &:hover {
                        opacity: 1;
                    }
                }
            }

            .filter-dialog-body {
                padding: 15px;
                overflow-y: auto;
                max-height: 400px;

                /* 自定义滚动条样式 */
                &::-webkit-scrollbar {
                    width: 3px;
                    height: 3px;
                }

                &::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }

                &::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;

                    &:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }
                }

                .filter-item {
                    margin-bottom: 10px;
                    color: #ddd;
                    font-size: 10px;
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;

                    label {
                        display: flex;
                        align-items: center;
                        cursor: pointer;

                        input[type="checkbox"] {
                            margin-right: 8px;
                        }
                    }

                    .filter-select-container {
                        display: flex;
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                        width: 220px;

                        .filter-select {
                            width: 100px;
                            height: 25px;
                            border: none;
                            border-radius: 4px;
                            background: rgba(255, 255, 255, 0.1);
                            color: #ddd;
                            padding: 4px 8px;
                            font-size: 10px;
                            outline: none;

                            &:focus {}

                            option {
                                background: #2c3033;
                                color: #ddd;
                            }
                        }

                        .filter-input {
                            width: 100px;
                            height: 25px;
                            border: none;
                            border-radius: 4px;
                            background: rgba(255, 255, 255, 0.1);
                            color: #fff;
                            padding: 4px 8px;
                            font-size: 10px;
                            outline: none;
                            margin-left: 10px;

                            &:focus {}
                        }
                    }
                }
            }

            .filter-dialog-footer {
                padding: 3px;
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;


                button {
                    margin: 2px 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;

                    &.apply-btn {
                        background: #1a73e8;
                        color: white;

                        &:hover {
                            background: #1557b0;
                        }
                    }

                    &.cancel-btn {
                        background: rgba(255, 255, 255, 0.1);
                        color: #ddd;

                        &:hover {
                            background: rgba(255, 255, 255, 0.2);
                        }
                    }
                }
            }
        }
    }

    .connection-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;

        .connection-dialog-content {
            background: #2c3033;
            border-radius: 8px;
            width: 400px;
            display: flex;
            flex-direction: column;

            .connection-dialog-header {
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                h3 {
                    margin: 0;
                    color: #ddd;
                    font-size: 16px;
                }

                .close-icon {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    opacity: 0.7;

                    &:hover {
                        opacity: 1;
                    }
                }
            }

            .connection-dialog-body {
                padding: 15px;

                .form-item {
                    margin-bottom: 15px;

                    label {
                        display: block;
                        color: #ddd;
                        margin-bottom: 5px;
                        font-size: 12px;
                    }

                    input {
                        width: 100%;
                        height: 30px;
                        border: none;
                        border-radius: 4px;
                        background: rgba(255, 255, 255, 0.1);
                        color: #fff;
                        padding: 0 10px;
                        font-size: 12px;
                        outline: none;

                        &:focus {
                            background: rgba(255, 255, 255, 0.15);
                        }
                    }
                }
            }

            .connection-dialog-footer {
                padding: 10px 15px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);

                button {
                    padding: 6px 15px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;

                    &.save-btn {
                        background: #1a73e8;
                        color: white;

                        &:hover {
                            background: #1557b0;
                        }
                    }

                    &.cancel-btn {
                        background: rgba(255, 255, 255, 0.1);
                        color: #ddd;

                        &:hover {
                            background: rgba(255, 255, 255, 0.2);
                        }
                    }
                }
            }
        }
    }

    .import-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;

        .import-dialog-content {
            background: #2c3033;
            border-radius: 8px;
            width: 400px;
            display: flex;
            flex-direction: column;

            .import-dialog-header {
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                h3 {
                    margin: 0;
                    color: #ddd;
                    font-size: 16px;
                }

                .close-icon {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    opacity: 0.7;

                    &:hover {
                        opacity: 1;
                    }
                }
            }

            .import-dialog-body {
                padding: 15px;

                .form-item {
                    margin-bottom: 15px;

                    label {
                        display: block;
                        color: #ddd;
                        margin-bottom: 5px;
                        font-size: 12px;
                    }

                    select,
                    input {
                        width: 100%;
                        height: 30px;
                        border: none;
                        border-radius: 4px;
                        background: rgba(255, 255, 255, 0.1);
                        color: #fff;
                        padding: 0 10px;
                        font-size: 12px;
                        outline: none;

                        &:focus {
                            background: rgba(255, 255, 255, 0.15);
                        }

                        option {
                            background: #2c3033;
                            color: #ddd;
                        }
                    }

                    .file-input {
                        display: flex;
                        gap: 10px;
                        align-items: center;

                        button {
                            padding: 6px 15px;
                            border: none;
                            border-radius: 4px;
                            background: #1a73e8;
                            color: white;
                            cursor: pointer;
                            font-size: 12px;

                            &:hover {
                                background: #1557b0;
                            }
                        }

                        span {
                            color: #ddd;
                            font-size: 12px;
                            flex: 1;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }
                    }
                }
            }

            .import-dialog-footer {
                padding: 10px 15px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);

                button {
                    padding: 6px 15px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;

                    &.import-btn {
                        background: #1a73e8;
                        color: white;

                        &:hover:not(:disabled) {
                            background: #1557b0;
                        }

                        &:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                        }
                    }

                    &.cancel-btn {
                        background: rgba(255, 255, 255, 0.1);
                        color: #ddd;

                        &:hover {
                            background: rgba(255, 255, 255, 0.2);
                        }
                    }
                }
            }
        }
    }
}
</style>