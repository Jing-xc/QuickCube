<template>
    <div class="tools-sidebar">
        <div class="tool-item" v-for="tool in state.tools" :key="tool.name"
            :class="[tool.iconClass, { active: state.activeToolName === tool.name }]" @click="handleToolClick(tool)">
            <div class="tool-icon" :class="tool.iconClass">
                <img :src="tool.icon" class="image" />
            </div>
            <span class="tool-name">{{ tool.name }}</span>
        </div>
    </div>
</template>

<script setup>
import { reactive, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import RedisIcon from '../assets/Redis.svg'
import MySQLIcon from '../assets/mysql.svg'
import MongoIcon from '../assets/mongo.svg'
import PostgresIcon from '../assets/Postgresql.svg'

const router = useRouter()
const route = useRoute()

const state = reactive({
    activeToolName: 'Redis',
    tools: [
        { name: 'Redis', icon: RedisIcon, iconClass: 'redis' },
        { name: 'MySQL', icon: MySQLIcon, iconClass: 'mysql' },
        { name: 'MongoDB', icon: MongoIcon, iconClass: 'mongo' },
        { name: 'PostgreSQL', icon: PostgresIcon, iconClass: 'postgres' }
    ]
})

// 监听路由变化，同步更新工具栏状态
watch(() => route.name, (newRoute) => {
    if (newRoute) {
        const matchedTool = state.tools.find(
            tool => tool.name.toLowerCase() === newRoute.toLowerCase()
        )
        if (matchedTool) {
            state.activeToolName = matchedTool.name
        }
    }
}, { immediate: true })

const handleToolClick = (tool) => {
    const targetRoute = `/${tool.name.toLowerCase()}`
    if (router.currentRoute.value.path !== targetRoute) {
        router.push(targetRoute)
    }
}

// 初始化时同步路由状态
onMounted(() => {
    const currentRoute = route.name
    if (currentRoute) {
        const matchedTool = state.tools.find(
            tool => tool.name.toLowerCase() === currentRoute.toLowerCase()
        )
        if (matchedTool) {
            state.activeToolName = matchedTool.name
        }
    }
})
</script>

<style scoped lang="scss">
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
                border-radius: 0 2px 2px 0;
            }

            &.redis::before {
                background: #dc382d;
            }

            &.mysql::before {
                background: #00758f;
            }

            &.mongo::before {
                background: #13aa52;
            }

            &.postgres::before {
                background: #336791;
            }
        }

        .tool-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;

            .image {
                width: 32px;
                height: 32px;
            }
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
                border-radius: 0 2px 2px 0;
            }

            &.redis::before {
                background: linear-gradient(180deg, #dc382d, #b42d24);
            }

            &.mysql::before {
                background: linear-gradient(180deg, #00758f, #005c72);
            }

            &.mongo::before {
                background: linear-gradient(180deg, #13aa52, #0f8842);
            }

            &.postgres::before {
                background: linear-gradient(180deg, #336791, #264d6d);
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
</style>