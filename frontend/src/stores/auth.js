import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '../api/http.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)
  const error = ref('')
  const isAdmin = computed(() => user.value?.role === 'admin')
  let pending
  async function initialize() {
    if (ready.value) return
    if (pending) return pending
    pending = (async () => {
      try { user.value = (await http.get('/auth/me')).user; error.value = '' }
      catch (e) { error.value = e.message }
      finally { ready.value = true; pending = null }
    })()
    return pending
  }
  async function login(username, password) {
    user.value = (await http.post('/auth/login', { username, password })).user
    ready.value = true
    error.value = ''
  }
  function clear() { user.value = null; ready.value = true }
  async function logout() { await http.post('/auth/logout'); clear() }
  async function changePassword(currentPassword, newPassword) {
    await http.post('/auth/password', { currentPassword, newPassword })
    clear()
  }
  return { user, ready, error, isAdmin, initialize, login, logout, clear, changePassword }
})
