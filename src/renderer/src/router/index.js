import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Redis',
    component: () => import('../views/Redis.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router