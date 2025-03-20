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
            <div class="toolbar-item" @click="openFilterDialog">
                <img class="toolbar-item-icon" src="../assets/search.svg">
                <text class="toolbar-item-text">筛选</text>
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
                                v-if="currentConnection?.id === conn.id">
                        </div>
                        <!-- 展示数据库列表 -->
                        <div class="databases" v-if="currentConnection">
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
                    <img src="../assets/close.svg" @click="showFilterDialog = false" class="close-icon">
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
    </div>
</template>

<script setup>
import { ref } from 'vue'
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

// 获取数据库列表
const fetchDatabases = async () => {
    try {
        isLoading.value = true // 开始加载
        const result = await ipcRenderer.invoke('mysql:execute', 'SHOW DATABASES')
        if (result.success) {
            databases.value = result.data.map(row => row['数据库名'])
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
        const result = await ipcRenderer.invoke('mysql:execute', `SHOW TABLES FROM ${currentDatabase.value}`)
        if (result.success) {
            tables.value = result.data.map(row => Object.values(row)[0])
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
}
</style>