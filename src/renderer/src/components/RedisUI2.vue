<template>
    <div class="redis-ui-container">
        <div class="toolbars">
            <div class="toolbar-item" @click="">
                <img class="toolbar-item-icon" src="../assets/link.svg">
                <text class="toolbar-item-text">链接</text>
            </div>
            <div class="toolbar-item" @click="">
                <img class="toolbar-item-icon" src="../assets/delete.svg">
                <text class="toolbar-item-text">删除</text>
            </div>
            <div class="toolbar-item" @click="">
                <img class="toolbar-item-icon" src="../assets/add-search.svg">
                <text class="toolbar-item-text">查询</text>
            </div>
            <div class="toolbar-item" @click="">
                <img class="toolbar-item-icon" src="../assets/search.svg">
                <text class="toolbar-item-text">筛选</text>
            </div>
            <div class="toolbar-item" @click="">
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
                                <img class="connection-item-icon" src="../assets/redis.svg">
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
                                        <img class="database-item-icon" src="../assets/database-1.svg">
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
                                <div class="keys" v-if="currentDatabase === db">
                                    <div v-for="key in keys" :key="key" class="key-items" @click="loadKeyContent(key)">
                                        <div class="key-item">
                                            <span class="key-type" :class="key.type">{{ key.type }}</span>
                                            <span class="key-name">{{ key.name }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="content-center">
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
                        <div class="editor-header">
                            <div class="type-indicator">{{ currentKeyType }}</div>
                            <button class="save-btn" @click="handleSave" :disabled="!hasChanges">
                                <span class="icon"><img src="../assets/save.svg"
                                        style="height: 20px;width: 20px;" /></span>
                                保存更改
                            </button>
                        </div>
                        <!-- 字符串类型编辑器 -->
                        <div v-if="currentKeyType === 'string'" class="string-editor">
                            <textarea v-model="keyContent" @input="handleInput" :placeholder="'输入字符串值...'"
                                rows="4"></textarea>
                        </div>
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
    </div>
</template>

<script setup>
// 导入需要的组件和方法
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
const ipcRenderer = window.electron.ipcRenderer

const isLoading = ref(false)
const currentConnection = ref(null)
const currentDatabase = ref(null)
const databases = ref([])
const keys = ref([])
const currentKeyType = ref(null)
const currentKey = ref(null)
const keyContent = ref(null)
const connections = ref([{
    id: 'default',
    name: 'localhost',
    host: 'localhost',
    port: 6379,
    password: '',
}])

const selectConnection = async (conn) => {
    currentConnection.value = conn

    // 尝试连接并获取数据库列表
    try {
        isLoading.value = true
        // 连接数据
        const { host, port, password } = conn;
        const result = await ipcRenderer.invoke('redis:connect', { host, port, password })

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

// 获取数据库列表
const fetchDatabases = async () => {
    try {
        isLoading.value = true // 开始加载
        databases.value = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']
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

// 发送请求获取所有keys
const fetchTables = async (db) => {
    currentDatabase.value = db
    try {
        isLoading.value = true // 开始加载
        // 发送请求获取所有keys
        const result = await ipcRenderer.invoke('redis:execute', 'KEYS *')
        if (result.success) {
            keys.value = await Promise.all(result.result.map(async key => {
                const typeResult = await ipcRenderer.invoke('redis:execute', `TYPE ${key}`)
                return {
                    name: key,
                    type: typeResult.result
                }
            }))
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

// 加载键内容
const loadKeyContent = async (key) => {

    isLoading.value = true // 开始加载
    try {
        let command
        switch (key.type) {
            case 'string':
                currentKey.value = key.name
                currentKeyType.value = 'string'
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
        ElMessage({
            message: '获取内容失败:' + error.message,
            type: 'error',
            duration: 2000
        });
    } finally {
        isLoading.value = false // 结束加载
    }
}

const closeConnection = () => {
    currentConnection.value = null
}
</script>

<style scoped lang="scss">
.redis-ui-container {
    // 样式定义 
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
                                height: 18px;
                                width: 18px;
                                margin: 0 3px 0 10px;
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

                            .keys {
                                display: flex;
                                flex-direction: column;
                                align-items: flex-start;
                                margin-left: 30px;

                                .key-items {
                                    display: flex;
                                    flex-direction: column;

                                    .key-item {
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

                                        .key-type {
                                            padding: 0px 6px;
                                            border-radius: 3px;
                                            font-size: 12px;
                                            margin-right: 8px;
                                            font-weight: 500;

                                            &.string {
                                                background: rgba(76, 175, 80, 0.2);
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
                                            font-size: 12px;
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
            display: flex;
            flex-direction: column;
            overflow: hidden;

            .key-info {
                height: 100%;
                display: flex;
                flex-direction: column;

                .info-header {
                    height: 30px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    .key-details {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        height: 30px;

                        h3 {
                            margin: 0;
                            color: #e4e4e4;
                            font-size: 15px;
                        }

                        .type-badge {
                            padding: 3px 10px;
                            border-radius: 16px;
                            font-size: 11px;
                            background: rgba(76, 175, 80, 0.1);
                            color: #4CAF50;
                            font-weight: 500;
                        }
                    }

                    .actions {
                        display: flex;
                        gap: 10px;
                        align-items: center;
                        height: 30px;

                        button {

                            border-radius: 16px;
                            border: none;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 500;
                            transition: all 0.3s ease;

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
</style>
