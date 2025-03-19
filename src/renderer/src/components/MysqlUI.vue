<template>
    <div class="mysql-ui-container">
        <div class="toolbars">
            <div class="toolbar-item">
                <img class="toolbar-item-icon" src="../assets/link.svg">
                <text class="toolbar-item-text">链接</text>
            </div>
            <div class="toolbar-item">
                <img class="toolbar-item-icon" src="../assets/add-search.svg">
                <text class="toolbar-item-text">查询</text>
            </div>
        </div>
        <div class="ui-container">
            <div class="sidebar">
                <div class="connections">
                    <div v-for="conn in connections" :key="conn.id" class="connection-items"
                        @click="selectConnection(conn)">
                        <div class="connection-item">
                            <img class="connection-item-icon" src="../assets/mysql.svg">
                            <text v-if="currentConnection?.id === conn.id" class="connection-item-text connect">{{
                        conn.name
                    }}</text>
                            <text v-else class="connection-item-text">{{ conn.name
                                }}</text>
                            <img class="connection-item-icon" src="../assets/open.svg" style="width: 16px;height: 16px;"
                                v-if="currentConnection?.id === conn.id">
                        </div>
                        <!-- 展示数据库列表 -->
                        <div class="databases" v-if="currentConnection">
                            <div v-for="db in databases" :key="db" class="database-item" @click="currentDatabase = db">
                                <img class="database-item-icon" src="../assets/database.svg">
                                <text class="database-item-text">{{ db }}</text>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
    <!-- <div>
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

        <div class="databases" v-if="currentConnection">
            <div class="database" v-for="db in databases" :key="db" @click="currentDatabase = db">
                <img src="../assets/database.svg" alt="database" class="database-icon" />
                {{ db }}
            </div>
        </div>

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
    </div> -->



    <!-- <div class="mysql-ui-container">
        <div class="loading-overlay" v-if="isLoading">
            <div class="loading-spinner"></div>
        </div>
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
    </div> -->
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
        host: '127.0.0.1',
        port: 3306,  // 添加默认端口
        user: 'root',
        password: '847047477',
        database: 'mysql'
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
        const { host, port, user, password, database } = connection;
        const result = await ipcRenderer.invoke('mysql:connect', {
            host,
            port,  // 添加默认端口
            user,
            password,
            database
        })
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
.mysql-ui-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;

    .toolbars {
        width: 100%;
        height: 60px;
        background: linear-gradient(to right, #6d737a, #282e2d);
        display: flex;
        align-items: center;

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
        height: calc(100% - 60px);
        width: 100%;

        .sidebar {
            height: 100%;
            width: 200px;
            overflow-y: auto;
            overflow-x: auto;
            background: linear-gradient(to right, #6d737a, #282e2d);
            color: #fff;
            //padding: 10px 0;
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

                    .databases {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        margin-left: 10px;

                        .database-item {
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

                            .database-item-icon {
                                height: 20px;
                                width: 20px;
                                margin-left: 10px;
                            }

                            .database-item-text {
                                font-size: 12px;
                                color: #ddd;

                                &:hover {
                                    color: #fff;
                                }
                            }
                        }
                    }

                }
            }
        }
    }
}
</style>