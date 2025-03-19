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
                    <div v-for="conn in connections" :key="conn.id" class="connection-items">
                        <div class="connection-item">
                            <div class="connection-item-inner" @click="selectConnection(conn)">
                                <img class="connection-item-icon" src="../assets/mysql.svg">
                                <text v-if="currentConnection?.id === conn.id" class="connection-item-text connect">{{
                        conn.name
                    }}</text>
                                <text v-else class="connection-item-text">{{ conn.name
                                    }}</text>
                            </div>

                            <img class="connection-item-icon" src="../assets/open.svg" style="width: 12px;height: 12px;"
                                v-if="currentConnection?.id === conn.id">
                        </div>
                        <!-- 展示数据库列表 -->
                        <div class="databases" v-if="currentConnection">
                            <div v-for="db in databases" :key="db" class="database-items">
                                <div class="database-item">
                                    <div class="database-item-inner" @click="fetchTables(db)">
                                        <img class="database-item-icon" src="../assets/database.svg">
                                        <text v-if="currentDatabase === db" class=" database-item-text connect">{{ db
                                            }}</text>
                                        <text v-else class=" database-item-text">{{ db
                                            }}</text>
                                    </div>

                                    <img class="close" src="../assets/close.svg" v-if="currentDatabase === db"
                                        @click="currentDatabase = ''">
                                </div>
                                <!-- 添加表的展示 -->
                                <div class="tables" v-if="currentDatabase == db">
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
const fetchTables = async (db) => {
    currentDatabase.value = db
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
        const result = await ipcRenderer.invoke('mysql:execute', `DESCRIBE ${currentDatabase.value}.${currentTable.value}`)
        if (result.success) {
            alert(JSON.stringify(result.data));
            //columns.value = result.data.map(row => row['字段名'])
            columns.value = result.data
        }
    } catch (error) {
        console.error('获取表结构失败:', error)
    }
}

// 获取表数据
const fetchTableData = async () => {
    if (!currentTable.value) return
    try {
        const result = await ipcRenderer.invoke('mysql:execute', `SELECT * FROM ${currentDatabase.value}.${currentTable.value}`)
        alert(JSON.stringify(result));
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
const handleTableChange = async (table) => {
    alert('切换表格');
    currentTable.value = table;
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
                                            height: 20px;
                                            width: 20px;
                                        }

                                        .table-item-text {
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
                        background: rgba(0, 0, 0, 0.2);
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

                    tbody tr:hover {
                        background: rgba(255, 255, 255, 0.05);
                    }
                }
            }
        }
    }
}
</style>

<style scoped></style>