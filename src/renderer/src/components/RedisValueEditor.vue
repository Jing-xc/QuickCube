<template>
    <div class="redis-value-editor">
        <!-- 顶部操作栏 -->
        <div class="editor-header">
            <div class="type-indicator">{{ typeLabel }}</div>
            <button class="save-btn" @click="handleSave" :disabled="!hasChanges">
                <span class="icon"><img src="../assets/save.svg" style="height: 20px;width: 20px;" /></span>
                保存更改
            </button>
        </div>

        <!-- 字符串类型编辑器 -->
        <div v-if="type === 'string'" class="string-editor">
            <textarea v-model="localValue" @input="handleInput" :placeholder="'输入字符串值...'" rows="4"></textarea>
        </div>

        <!-- 列表类型编辑器 -->
        <div v-else-if="type === 'list'" class="list-editor">
            <div class="list-controls">
                <button class="add-btn" @click="addListItem">
                    <span class="icon">+</span>
                    添加项
                </button>
            </div>
            <div class="list-items">
                <div v-for="(item, index) in parsedValue" :key="index" class="list-item">
                    <div class="item-index">#{{ index + 1 }}</div>
                    <input type="text" v-model="parsedValue[index]" placeholder="输入列表项..."
                        @compositionstart="handleCompositionStart" @compositionend="handleCompositionEnd">
                    <button class="remove-btn" @click="removeListItem(index)">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 集合类型编辑器 -->
        <div v-else-if="type === 'set'" class="set-editor">
            <div class="set-controls">
                <button class="add-btn" @click="addSetItem">
                    <span class="icon">+</span>
                    添加成员
                </button>
            </div>
            <div class="set-items">
                <div v-for="(item, index) in parsedValue" :key="index" class="set-item">
                    <input type="text" v-model="parsedValue[index]" placeholder="输入集合成员..."
                        @compositionstart="handleCompositionStart" @compositionend="handleCompositionEnd">
                    <button class="remove-btn" @click="removeSetItem(index)">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 哈希类型编辑器 -->
        <div v-else-if="type === 'hash'" class="hash-editor">
            <div class="hash-controls">
                <button class="add-btn" @click="addHashField">
                    <span class="icon">+</span>
                    添加字段
                </button>
            </div>
            <div class="hash-items">
                <div v-for="(value, key) in parsedValue" :key="key" class="hash-item">
                    <input type="text" v-model="hashKeys[key]" placeholder="字段名" class="hash-key">
                    <input type="text" v-model="parsedValue[key]" placeholder="字段值" class="hash-value">
                    <button class="remove-btn" @click="removeHashField(key)">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 有序集合类型编辑器 -->
        <div v-else-if="type === 'zset'" class="zset-editor">
            <div class="zset-controls">
                <button class="add-btn" @click="addZSetItem">
                    <span class="icon">+</span>
                    添加成员
                </button>
            </div>
            <div class="zset-items">
                <div v-for="(item, index) in parsedValue" :key="index" class="zset-item">
                    <input type="text" v-model="parsedValue[index].member" placeholder="成员" class="zset-member">
                    <input type="number" v-model.number="parsedValue[index].score" placeholder="分数" class="zset-score">
                    <button class="remove-btn" @click="removeZSetItem(index)">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 未知类型提示 -->
        <div v-else class="unknown-type">
            <span class="icon">⚠️</span>
            不支持的数据类型
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
    type: {
        type: String,
        required: true
    },
    value: {
        type: [String, Array, Object],
        required: true
    }
})

const emit = defineEmits(['update'])

const localValue = ref('')
const parsedValue = ref([])
const hashKeys = ref({})
const originalValue = ref(null)

// 初始化值
const initializeValue = () => {
    switch (props.type) {
        case 'string':
            localValue.value = props.value
            originalValue.value = props.value
            break
        case 'list':
        case 'set':
            parsedValue.value = Array.isArray(props.value) ? [...props.value] : []
            originalValue.value = JSON.stringify(parsedValue.value)
            break
        case 'hash':
            if (Array.isArray(props.value)) {
                const obj = {}
                const keys = {}
                for (let i = 0; i < props.value.length; i += 2) {
                    const key = props.value[i]
                    const value = props.value[i + 1]
                    obj[key] = value
                    keys[key] = key
                }
                parsedValue.value = { ...obj }
                hashKeys.value = { ...keys }
            } else if (typeof props.value === 'object' && props.value !== null) {
                parsedValue.value = { ...props.value }
                hashKeys.value = Object.keys(props.value).reduce((acc, key) => {
                    acc[key] = key
                    return acc
                }, {})
            } else {
                parsedValue.value = {}
                hashKeys.value = {}
            }
            originalValue.value = JSON.stringify(parsedValue.value)
            break
        case 'zset':
            if (Array.isArray(props.value)) {
                const items = []
                for (let i = 0; i < props.value.length; i += 2) {
                    items.push({
                        member: props.value[i],
                        score: parseFloat(props.value[i + 1])
                    })
                }
                parsedValue.value = items
            } else {
                parsedValue.value = []
            }
            originalValue.value = JSON.stringify(parsedValue.value)
            break
    }
}

// 监听值变化
watch(() => props.value, initializeValue, { immediate: true })

// 处理输入事件
const handleInput = () => {
    emit('update', localValue.value)
}

// 计算是否有更改
const hasChanges = computed(() => {
    switch (props.type) {
        case 'string':
            return localValue.value !== originalValue.value
        case 'list':
        case 'set':
        case 'hash':
        case 'zset':
            return JSON.stringify(parsedValue.value) !== originalValue.value
        default:
            return false
    }
})

// 计算类型标签
const typeLabel = computed(() => {
    const typeMap = {
        'string': '字符串',
        'list': '列表',
        'set': '集合',
        'hash': '哈希表',
        'zset': '有序集合'
    }
    return typeMap[props.type] || '未知类型'
})

// 保存更改
const handleSave = () => {
    switch (props.type) {
        case 'string':
            emit('update', localValue.value)
            originalValue.value = localValue.value
            break
        case 'list':
        case 'set':
            const filteredValues = parsedValue.value.filter(Boolean)
            emit('update', filteredValues)
            originalValue.value = JSON.stringify(filteredValues)
            break
        case 'hash':
            const result = []
            for (const key in parsedValue.value) {
                if (parsedValue.value[key] !== undefined) {
                    result.push(hashKeys.value[key] || key, parsedValue.value[key])
                }
            }
            emit('update', result)
            originalValue.value = JSON.stringify(parsedValue.value)
            break
        case 'zset':
            const zsetResult = []
            parsedValue.value.forEach(item => {
                if (item.member && !isNaN(item.score)) {
                    zsetResult.push(item.member, item.score.toString())
                }
            })
            emit('update', zsetResult)
            originalValue.value = JSON.stringify(parsedValue.value)
            break
    }
}

// 列表操作
const addListItem = () => {
    parsedValue.value = [...parsedValue.value, '']
}

const removeListItem = (index) => {
    const newValue = [...parsedValue.value]
    newValue.splice(index, 1)
    parsedValue.value = newValue
}

// 集合操作
const addSetItem = () => {
    parsedValue.value = [...parsedValue.value, '']
}

const removeSetItem = (index) => {
    const newValue = [...parsedValue.value]
    newValue.splice(index, 1)
    parsedValue.value = newValue
}

// 哈希操作
const addHashField = () => {
    const timestamp = Date.now()
    const newKey = `field_${timestamp}`
    parsedValue.value = {
        ...parsedValue.value,
        [newKey]: ''
    }
    hashKeys.value = {
        ...hashKeys.value,
        [newKey]: newKey
    }
}

const removeHashField = (key) => {
    const newValue = { ...parsedValue.value }
    delete newValue[key]
    const newKeys = { ...hashKeys.value }
    delete newKeys[key]
    parsedValue.value = newValue
    hashKeys.value = newKeys
}

// 有序集合操作
const addZSetItem = () => {
    parsedValue.value = [...parsedValue.value, { member: '', score: 0 }]
}

const removeZSetItem = (index) => {
    const newValue = [...parsedValue.value]
    newValue.splice(index, 1)
    parsedValue.value = newValue
}

// 输入法控制
const isComposing = ref(false)

const handleCompositionStart = () => {
    isComposing.value = true
}

const handleCompositionEnd = () => {
    isComposing.value = false
}
</script>

<style scoped lang="scss">
.redis-value-editor {
    background: linear-gradient(-45deg, #222f36 0%, #565c5e 100%);
    border-radius: 12px;
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);

    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        .type-indicator {
            font-size: 13px;
            color: #e4e4e4;
            padding: 5px 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            font-weight: 500;
        }

        .save-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #4c9baf;
            color: white;
            padding: 6px 16px;
            border-radius: 5px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);

            &:hover {
                background: #4c9baf;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            }

            &:disabled {
                background: rgba(76, 175, 80, 0.2);
                color: rgba(255, 255, 255, 0.4);
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .icon {
                font-size: 16px;
            }
        }
    }

    textarea,
    input {
        width: 100%;
        background: #333333;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 14px;
        color: #e4e4e4;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 13px;
        transition: all 0.3s ease;

        &:focus {
            border-color: #4CAF50;
            outline: none;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
            background: #3a3a3a;
        }

        &::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }
    }

    button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.3s ease;

        &.add-btn {
            background: #4CAF50;
            color: white;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);

            &:hover {
                background: #43A047;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            }

            .icon {
                font-size: 18px;
                font-weight: bold;
            }
        }

        &.remove-btn {
            background: rgba(255, 77, 79, 0.1);
            color: #ff4d4f;
            padding: 5px;
            height: 24px;
            width: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;

            &:hover {
                background: rgba(255, 77, 79, 0.2);
                color: #ff7875;
                transform: rotate(90deg);
            }

            .icon {
                font-size: 16px;
                line-height: 1;
            }
        }
    }

    .list-editor,
    .set-editor,
    .hash-editor,
    .zset-editor {
        display: flex;
        flex-direction: column;
        gap: 14px;
        height: 100%;
        overflow: hidden;

        .list-items,
        .set-items,
        .hash-items,
        .zset-items {
            display: flex;
            flex-direction: column;
            gap: 10px;
            overflow-y: auto;
            padding-right: 10px;

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

            .list-item,
            .set-item,
            .hash-item,
            .zset-item {
                display: flex;
                gap: 10px;
                align-items: center;
                background: #333333;
                padding: 10px 14px;
                border-radius: 10px;
                transition: all 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.1);

                &:hover {
                    background: #3a3a3a;
                    border-color: #4CAF50;
                    transform: translateX(4px);
                }

                .item-index {
                    color: #e4e4e4;
                    font-size: 11px;
                    font-weight: 500;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 3px 6px;
                    border-radius: 8px;
                    min-width: 36px;
                }
            }
        }
    }

    .hash-editor {
        .hash-item {
            input.hash-key {
                width: 40%;
                background: rgba(76, 175, 80, 0.1);
                border-color: rgba(76, 175, 80, 0.2);

                &:focus {
                    background: #3a3a3a;
                    border-color: #4CAF50;
                }
            }

            input.hash-value {
                width: 60%;
            }
        }
    }

    .zset-editor {
        .zset-item {
            input.zset-member {
                width: 70%;
            }

            input.zset-score {
                width: 30%;
                text-align: right;
                background: rgba(76, 175, 80, 0.1);
                border-color: rgba(76, 175, 80, 0.2);

                &:focus {
                    background: #3a3a3a;
                    border-color: #4CAF50;
                }
            }
        }
    }

    .unknown-type {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #ff4d4f;
        font-size: 14px;
        padding: 30px;
        background: rgba(255, 77, 79, 0.1);
        border-radius: 10px;
        border: 2px dashed rgba(255, 77, 79, 0.3);

        .icon {
            font-size: 24px;
        }
    }
}
</style>