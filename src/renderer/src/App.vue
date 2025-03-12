<template>
  <div class="body">
    <router-view></router-view>
  </div>
</template>
<script setup>
import HeaderVue from './components/Header.vue'
</script>
<style lang="scss" scoped>
.body {
  height: 100vh;
  width: 100vw;
}
</style>
