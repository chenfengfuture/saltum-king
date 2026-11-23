import { createRouter, createWebHashHistory } from 'vue-router'
import { pinia } from '../stores/index.js'
import { useAuthStore } from '../stores/auth.js'

const router = createRouter({
  // Hash routing keeps API routes intact and needs no blanket EdgeOne rewrite.
  history: createWebHashHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    { path: '/', name: 'workbench', component: () => import('../views/WorkbenchView.vue') },
    { path: '/catalog', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/image', name: 'image-studio', component: () => import('../views/ImageStudioView.vue') },
    { path: '/members', name: 'members', component: () => import('../views/MembersView.vue'), meta: { admin: true } },
    { path: '/account', name: 'account', component: () => import('../views/AccountView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
})
router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)
  await auth.initialize()
  if (!to.meta.public && !auth.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.user) return '/'
  if (to.meta.admin && !auth.isAdmin) return '/'
})
export default router
