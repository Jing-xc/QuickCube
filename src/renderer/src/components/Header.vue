<template>
    <div class="header">
        <div class="funcs" v-for="item in funcs">
            <img :src="item.img" class="fun-image" />
            <div class="fun-text">{{ item.desc }}</div>
        </div>
    </div>
</template>
<script setup>
import { ref } from 'vue';

const funcs = ref([
    { img: new URL('../assets/link.svg', import.meta.url).href, desc: '连接' },
    { img: new URL('../assets/data.svg', import.meta.url).href, desc: '数据' }
])

</script>
<style lang="scss" scoped>
.header {
    height: 60px;
    width: 100vw;
    background: linear-gradient(to right, #5312D6 0%, #e8d07a 100%);
    display: flex;
    justify-content: flex-start;
    align-items: center;

    .funcs {
        height: 60px;
        width: 60px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        margin-right: 5px;

        .fun-image {
            height: 40px;
            width: 40px;
        }

        .fun-text {
            height: 20px;
            font-size: 12px;
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
        }
    }
}
</style>
