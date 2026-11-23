import { createApp } from 'vue'
import App from './App.vue'
import { pinia } from './stores/index.js'
import { useAuthStore } from './stores/auth.js'
import { useLookStore } from './stores/look.js'
import router from './router/index.js'
import './styles/index.css'

const app = createApp(App).use(pinia).use(router)
window.addEventListener('saltum:unauthorized', () => {
  useAuthStore(pinia).clear()
  useLookStore(pinia).reset()
  if (router.currentRoute.value.name !== 'login') router.replace('/login')
})
app.mount('#app')
