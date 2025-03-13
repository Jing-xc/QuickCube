<template>
    <div class="tools-sidebar">
        <div class="tool-item" v-for="tool in tools" :key="tool.name" :class="{ active: tool.active }"
            @click="handleToolClick(tool)">
            <div class="tool-icon" :class="tool.iconClass">
                <img :src="tool.icon" class="image" />
            </div>
            <span class="tool-name">{{ tool.name }}</span>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import RedisIcon from '../assets/Redis.svg'
import MySQLIcon from '../assets/mysql.svg'
import MongoIcon from '../assets/mongo.svg'
import PostgresIcon from '../assets/Postgresql.svg'

const emit = defineEmits(['toolSelect'])

const tools = [
    { name: 'Redis', icon: RedisIcon, iconClass: 'redis', active: true },
    { name: 'MySQL', icon: MySQLIcon, iconClass: 'mysql', active: false },
    { name: 'MongoDB', icon: MongoIcon, iconClass: 'mongo', active: false },
    { name: 'PostgreSQL', icon: PostgresIcon, iconClass: 'postgres', active: false }
]

const handleToolClick = (tool) => {
    emit('toolSelect', tool.name)
}
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
                background: linear-gradient(180deg, #ff4b2b, #ff416c);
                border-radius: 0 2px 2px 0;
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

            &.redis {
                color: #dc382d;
            }

            &.mysql {
                color: #00758f;
            }

            &.mongo {
                color: #13aa52;
            }

            &.postgres {
                color: #336791;
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