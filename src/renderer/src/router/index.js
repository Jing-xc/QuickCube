import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/redis'  // 将根路径重定向到 Redis 页面
  },
  {
    path: '/redis',
    name: 'Redis',
    component: () => import('../views/Redis.vue'),
    meta: {
      title: 'Redis 客户端'
    }
  },
  {
    path: '/mysql',
    name: 'Mysql',
    component: () => import('../views/Mysql.vue'),
    meta: {
      title: 'MySQL 客户端'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 添加全局导航守卫来更新页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `QuickCube - ${to.meta.title}`
  }
  next()
})

export default router