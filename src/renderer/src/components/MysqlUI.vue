<template>
    <div>
        <!-- 数据库连接管理 -->
        <div class="connection-manager">
            <div class="connection-list">
                <div class="connection-item" v-for="conn in connections" :key="conn.id"
                    :class="{ active: currentConnection?.id === conn.id }" @click="selectConnection(conn)">
                    <img src="../assets/database-server.svg" alt="connection" class="connection-icon" />
                    <span>{{ conn.name }}</span>
                    <button class="delete-btn" @click.stop="deleteConnection(conn)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <button class="add-connection-btn" @click="showConnectionDialog = true">
                <i class="fas fa-plus"></i> 新增连接
            </button>
        </div>

        <!-- 数据库列表 -->
        <div class="databases" v-if="currentConnection">
            <div class="database" v-for="db in databases" :key="db" @click="currentDatabase = db">
                <img src="../assets/database.svg" alt="database" class="database-icon" />
                {{ db }}
            </div>
        </div>

        <!-- 新增/编辑连接对话框 -->
        <div class="dialog" v-if="showConnectionDialog">
            <div class="dialog-content">
                <h3>{{ editingConnection ? '编辑连接' : '新增连接' }}</h3>
                <form @submit.prevent="handleConnectionSubmit">
                    <div class="form-group">
                        <label>连接名称</label>
                        <input v-model="connectionForm.name" required placeholder="例如: 本地数据库">
                    </div>
                    <div class="form-group">
                        <label>主机地址</label>
                        <input v-model="connectionForm.host" required placeholder="localhost">
                    </div>
                    <div class="form-group">
                        <label>端口</label>
                        <input v-model="connectionForm.port" type="number" required placeholder="3306">
                    </div>
                    <div class="form-group">
                        <label>用户名</label>
                        <input v-model="connectionForm.user" required placeholder="root">
                    </div>
                    <div class="form-group">
                        <label>密码</label>
                        <input v-model="connectionForm.password" type="password" placeholder="请输入密码">
                    </div>
                    <div class="dialog-buttons">
                        <button type="submit" class="btn-primary">保存</button>
                        <button type="button" class="btn-secondary" @click="closeConnectionDialog">取消</button>
                    </div>
                </form>
            </div>
        </div>
    </div>



    <div class="mysql-ui-container">
        <!-- 加载动画 -->
        <div class="loading-overlay" v-if="isLoading">
            <div class="loading-spinner"></div>
        </div>
        <!-- 数据库选择区域 -->
        <div class="database-selector">
            <select v-model="currentDatabase" @change="handleDatabaseChange">
                <option value="">选择数据库</option>
                <option v-for="db in databases" :key="db" :value="db">{{ db }}</option>
            </select>
            <select v-model="currentTable" @change="handleTableChange">
                <option value="">选择数据表</option>
                <option v-for="table in tables" :key="table" :value="table">{{ table }}</option>
            </select>
        </div>

        <!-- 操作工具栏 -->
        <div class="toolbar">
            <button class="btn" @click="fetchDatabases">
                <i class="fas fa-sync"></i> 链接
            </button>
            <button class="btn" @click="refreshData">
                <i class="fas fa-sync"></i> 刷新
            </button>
            <button class="btn" @click="showAddDialog = true" :disabled="!currentTable">
                <i class="fas fa-plus"></i> 新增
            </button>
            <div class="search-box">
                <input type="text" v-model="searchQuery" placeholder="搜索..." @input="handleSearch">
                <i class="fas fa-search"></i>
            </div>
        </div>

        <!-- 数据表格 -->
        <div class="table-container" v-if="currentTable">
            <table>
                <thead>
                    <tr>
                        <th v-for="column in columns" :key="column">
                            {{ column }}
                            <span class="sort-icon" @click="sortBy(column)">
                                ⇅
                            </span>
                        </th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in filteredData" :key="index">
                        <td v-for="column in columns" :key="column">
                            {{ row[column] }}
                        </td>
                        <td class="actions">
                            <button class="btn-edit" @click="editRow(row)">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" @click="deleteRow(row)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 新增/编辑对话框 -->
        <div class="dialog" v-if="showAddDialog || showEditDialog">
            <div class="dialog-content">
                <h3>{{ showEditDialog ? '编辑数据' : '新增数据' }}</h3>
                <form @submit.prevent="handleSubmit">
                    <div v-for="column in columns" :key="column" class="form-group">
                        <label>{{ column }}</label>
                        <input v-model="formData[column]" :placeholder="column">
                    </div>
                    <div class="dialog-buttons">
                        <button type="submit" class="btn-primary">确定</button>
                        <button type="button" class="btn-secondary" @click="closeDialog">取消</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const ipcRenderer = window.electron.ipcRenderer

// 状态管理
const databases = ref([])
const tables = ref([])
const columns = ref([])
const tableData = ref([])
const currentDatabase = ref('')
const currentTable = ref('')
const searchQuery = ref('')
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const formData = ref({})
const sortConfig = ref({ column: '', direction: 'asc' })
const isLoading = ref(false)


// 数据库连接相关的状态
const connections = ref([
    {
        id: 'default',
        name: 'localhost',
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '847047477'
    }
])
const currentConnection = ref(null)
const showConnectionDialog = ref(false)
const editingConnection = ref(null)
const connectionForm = ref({
    name: '',
    host: '',
    port: 3306,
    user: '',
    password: ''
})

// 选择连接
const selectConnection = async (connection) => {
    currentConnection.value = connection
    // 尝试连接并获取数据库列表
    try {
        isLoading.value = true
        const result = await ipcRenderer.invoke('mysql:connect', connection)
        if (result.success) {
            await fetchDatabases()
        }
    } catch (error) {
        alert('连接失败：' + error.message)
    } finally {
        isLoading.value = false
    }
}

// 删除连接
const deleteConnection = (connection) => {
    if (confirm(`确定要删除连接 "${connection.name}" 吗？`)) {
        const index = connections.value.findIndex(c => c.id === connection.id)
        if (index > -1) {
            connections.value.splice(index, 1)
            if (currentConnection.value?.id === connection.id) {
                currentConnection.value = null
                databases.value = []
            }
        }
    }
}

// 处理连接表单提交
const handleConnectionSubmit = () => {
    const newConnection = {
        id: editingConnection.value?.id || Date.now().toString(),
        ...connectionForm.value
    }

    if (editingConnection.value) {
        const index = connections.value.findIndex(c => c.id === editingConnection.value.id)
        if (index > -1) {
            connections.value[index] = newConnection
        }
    } else {
        connections.value.push(newConnection)
    }

    closeConnectionDialog()
}

// 关闭连接对话框
const closeConnectionDialog = () => {
    showConnectionDialog.value = false
    editingConnection.value = null
    connectionForm.value = {
        name: '',
        host: '',
        port: 3306,
        user: '',
        password: ''
    }
}

// 修改获取数据库列表的方法
const fetchDatabases = async () => {
    try {
        isLoading.value = true // 开始加载
        const result = await ipcRenderer.invoke('mysql:execute', 'SHOW DATABASES')
        if (result.success) {
            databases.value = result.data.map(row => row['数据库名'])
        }
    } catch (error) {
        alert('获取数据库列表失败')
    } finally {
        isLoading.value = false // 结束加载
    }
}

// 获取表格列表
const fetchTables = async () => {
    if (!currentDatabase.value) return
    try {
        const result = await ipcRenderer.invoke('mysql:execute', `SHOW TABLES FROM ${currentDatabase.value}`)
        if (result.success) {
            tables.value = result.data.map(row => Object.values(row)[0])
        }
    } catch (error) {
        alert('获取表格列表失败')
        console.error('获取表格列表失败:', error)
    }
}

// 获取表结构
const fetchColumns = async () => {
    if (!currentTable.value) return
    try {
        const result = await ipcRenderer.invoke('mysql:execute', `DESCRIBE ${currentTable.value}`)
        if (result.success) {
            alert(JSON.stringify(result.data));
            columns.value = result.data.map(row => row['字段名'])
        }
    } catch (error) {
        console.error('获取表结构失败:', error)
    }
}

// 获取表数据
const fetchTableData = async () => {
    if (!currentTable.value) return
    try {
        const result = await ipcRenderer.invoke('mysql:execute', `SELECT * FROM ${currentTable.value}`)
        if (result.success) {
            alert(JSON.stringify(result.data));
            tableData.value = result.data
        }
    } catch (error) {
        console.error('获取表数据失败:', error)
    }
}

// 处理数据库切换
const handleDatabaseChange = async () => {
    try {
        await ipcRenderer.invoke('mysql:execute', `USE ${currentDatabase.value}`)
        currentTable.value = ''
        tables.value = []
        await fetchTables()
    } catch (error) {
        console.error('切换数据库失败:', error)
    }
}

// 处理表格切换
const handleTableChange = async () => {
    await fetchColumns()
    await fetchTableData()
}

// 刷新数据
const refreshData = () => {
    fetchTableData()
}

// 搜索过滤
const filteredData = computed(() => {
    if (!searchQuery.value) return tableData.value

    return tableData.value.filter(row =>
        Object.values(row).some(value =>
            String(value).toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    )
})

// 排序处理
const sortBy = (column) => {
    if (sortConfig.value.column === column) {
        sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc'
    } else {
        sortConfig.value.column = column
        sortConfig.value.direction = 'asc'
    }

    tableData.value.sort((a, b) => {
        const modifier = sortConfig.value.direction === 'asc' ? 1 : -1
        if (a[column] < b[column]) return -1 * modifier
        if (a[column] > b[column]) return 1 * modifier
        return 0
    })
}

// 编辑行
const editRow = (row) => {
    formData.value = { ...row }
    showEditDialog.value = true
}

// 删除行
const deleteRow = async (row) => {
    if (!confirm('确定要删除这条数据吗？')) return

    try {
        const primaryKey = columns.value[0] // 假设第一列是主键
        const result = await ipcRenderer.invoke('mysql:execute',
            `DELETE FROM ${currentTable.value} WHERE ${primaryKey} = ?`,
            [row[primaryKey]]
        )
        if (result.success) {
            await fetchTableData()
        }
    } catch (error) {
        console.error('删除数据失败:', error)
    }
}

// 提交表单
const handleSubmit = async () => {
    try {
        if (showEditDialog.value) {
            const primaryKey = columns.value[0]
            const sets = columns.value
                .filter(col => col !== primaryKey)
                .map(col => `${col} = ?`)
                .join(', ')
            const values = columns.value
                .filter(col => col !== primaryKey)
                .map(col => formData.value[col])
            values.push(formData.value[primaryKey])

            const result = await ipcRenderer.invoke('mysql:execute',
                `UPDATE ${currentTable.value} SET ${sets} WHERE ${primaryKey} = ?`,
                values
            )
            if (result.success) {
                await fetchTableData()
                closeDialog()
            }
        } else {
            const cols = columns.value.join(', ')
            const placeholders = columns.value.map(() => '?').join(', ')
            const values = columns.value.map(col => formData.value[col])

            const result = await ipcRenderer.invoke('mysql:execute',
                `INSERT INTO ${currentTable.value} (${cols}) VALUES (${placeholders})`,
                values
            )
            if (result.success) {
                await fetchTableData()
                closeDialog()
            }
        }
    } catch (error) {
        console.error('保存数据失败:', error)
    }
}

// 关闭对话框
const closeDialog = () => {
    showAddDialog.value = false
    showEditDialog.value = false
    formData.value = {}
}

// 组件挂载时初始化
onMounted(() => {
    fetchDatabases()
})
</script>

<style scoped lang="scss">
.connection-manager {
    width: 200px;
    padding: 10px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);

    .connection-list {
        margin-bottom: 10px;
    }

    .connection-item {
        display: flex;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.3s ease;

        &:hover {
            background: rgba(33, 150, 243, 0.1);
        }

        &.active {
            background: rgba(33, 150, 243, 0.2);
        }

        .connection-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
        }

        .delete-btn {
            margin-left: auto;
            padding: 4px;
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.3s ease;

            &:hover {
                color: #f44336;
            }
        }

        &:hover .delete-btn {
            opacity: 1;
        }
    }

    .add-connection-btn {
        width: 100%;
        padding: 8px;
        background: #2196F3;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
            background: #1976D2;
        }
    }
}

.databases {
    width: 200px;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: auto;

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
        width: 3px;
        height: 3px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        transition: background 0.3s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    }

    .database {
        margin: 5px 10px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        display: flex;
        align-items: center;
        white-space: nowrap; // 防止文本换行
        min-width: fit-content; // 确保内容不会被压缩

        .database-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
            flex-shrink: 0; // 防止图标被压缩
        }

        &:hover {
            background: rgba(33, 150, 243, 0.1);
        }
    }
}

.mysql-ui-container {
    padding: 24px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;

    .database-selector {
        display: flex;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);

        select {
            padding: 10px 16px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(0, 0, 0, 0.2);
            color: #e4e4e4;
            min-width: 220px;
            font-size: 14px;
            transition: all 0.3s ease;

            &:hover {
                border-color: rgba(33, 150, 243, 0.5);
            }

            &:focus {
                outline: none;
                border-color: #2196F3;
                box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
            }
        }
    }

    .toolbar {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);

        .btn {
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            background: #2196F3;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;

            i {
                font-size: 16px;
            }

            &:hover {
                background: #1976D2;
                transform: translateY(-1px);
            }

            &:active {
                transform: translateY(0);
            }

            &:disabled {
                background: #666;
                cursor: not-allowed;
                opacity: 0.7;
            }
        }

        .search-box {
            position: relative;
            margin-left: auto;
            min-width: 300px;

            input {
                width: 100%;
                padding: 10px 40px 10px 16px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(0, 0, 0, 0.2);
                color: #e4e4e4;
                font-size: 14px;
                transition: all 0.3s ease;

                &:hover {
                    border-color: rgba(33, 150, 243, 0.5);
                }

                &:focus {
                    outline: none;
                    border-color: #2196F3;
                    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
                }
            }

            i {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #888;
                font-size: 16px;
            }
        }
    }

    .table-container {
        flex: 1;
        overflow: auto;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 1px;

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;

            th,
            td {
                padding: 14px 16px;
                text-align: left;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            th {
                background: rgba(0, 0, 0, 0.3);
                font-weight: 500;
                color: #fff;
                position: sticky;
                top: 0;
                z-index: 1;

                &:first-child {
                    border-top-left-radius: 8px;
                }

                &:last-child {
                    border-top-right-radius: 8px;
                }

                .sort-icon {
                    cursor: pointer;
                    margin-left: 6px;
                    opacity: 0.5;
                    transition: opacity 0.3s ease;

                    &:hover {
                        opacity: 1;
                    }
                }
            }

            tr {
                transition: background-color 0.3s ease;

                &:hover {
                    background: rgba(33, 150, 243, 0.1);
                }

                &:last-child td {
                    border-bottom: none;
                }
            }

            .actions {
                white-space: nowrap;
                width: 120px;

                button {
                    padding: 8px;
                    border: none;
                    border-radius: 4px;
                    margin-right: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;

                    &.btn-edit {
                        background: #4CAF50;
                        color: white;

                        &:hover {
                            background: #388E3C;
                            transform: translateY(-1px);
                        }
                    }

                    &.btn-delete {
                        background: #F44336;
                        color: white;

                        &:hover {
                            background: #D32F2F;
                            transform: translateY(-1px);
                        }
                    }

                    &:active {
                        transform: translateY(0);
                    }
                }
            }
        }
    }

    .dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;

        .dialog-content {
            background: #2a2d31;
            border-radius: 8px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;

            h3 {
                margin: 0 0 20px 0;
                color: #e4e4e4;
            }

            .form-group {
                margin-bottom: 15px;

                label {
                    display: block;
                    margin-bottom: 5px;
                    color: #adb5bd;
                }

                input {
                    width: 100%;
                    padding: 8px;
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(0, 0, 0, 0.2);
                    color: #e4e4e4;

                    &:focus {
                        outline: none;
                        border-color: #2196F3;
                    }
                }
            }

            .dialog-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;

                button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;

                    &.btn-primary {
                        background: #2196F3;
                        color: white;

                        &:hover {
                            background: #1976D2;
                        }
                    }

                    &.btn-secondary {
                        background: #666;
                        color: white;

                        &:hover {
                            background: #555;
                        }
                    }
                }
            }
        }
    }
}

// 添加一些动画效果
@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.dialog {
    animation: fadeIn 0.2s ease-in-out;
}

// 适配暗色主题
@media (prefers-color-scheme: dark) {
    .mysql-ui-container {
        background: #1a1d21;
        color: #e4e4e4;
    }
}

// 响应式布局
@media screen and (max-width: 768px) {
    .mysql-ui-container {
        padding: 10px;

        .database-selector {
            flex-direction: column;

            select {
                width: 100%;
            }
        }

        .toolbar {
            flex-wrap: wrap;

            .search-box {
                width: 100%;
                margin: 10px 0;

                input {
                    width: 100%;
                }
            }
        }

        .dialog .dialog-content {
            width: 90%;
            margin: 0 10px;
        }
    }
}
</style>