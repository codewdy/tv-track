import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../components/AnimeList/AnimeList.vue'),
    },
    {
      path: '/add-anime',
      name: 'add-anime',
      component: () => import('../components/AddAnime/AddAnime.vue'),
    },
    {
      path: '/download',
      name: 'download',
      component: () => import('../components/DownloadStatus/DownloadStatus.vue'),
    },
  ],
})

export default router
