import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../components/TVList/TVList.vue'),
    },
    {
      path: '/add-tv',
      name: 'add-tv',
      component: () => import('../components/AddTV/AddTV.vue'),
    },
    {
      path: '/download',
      name: 'download',
      component: () => import('../components/DownloadStatus/DownloadStatus.vue'),
    },
    {
      path: '/error-log',
      name: 'error-log',
      component: () => import('../components/ErrorLog/ErrorLog.vue'),
    },
  ],
})

export default router
