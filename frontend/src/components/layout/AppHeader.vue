<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useLookStore } from '../../stores/look.js'
const auth = useAuthStore()
const store = useLookStore()
const router = useRouter()
const error = ref('')
const busy = ref(false)
async function logout() {
  busy.value = true
  try { await auth.logout(); store.reset(); await router.replace('/login') }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <a class="skip-link" href="#main-content">跳转到主要内容</a>
  <header class="app-header">
    <RouterLink to="/" class="logo">SALTUM <span>KING 工作台</span></RouterLink>
    <nav class="main-nav" aria-label="主要导航">
      <RouterLink to="/" exact-active-class="active">搭配工作台</RouterLink>
      <RouterLink to="/catalog" active-class="active">商品目录</RouterLink>
      <RouterLink to="/image" active-class="active">图片任务</RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/members" active-class="active">成员管理</RouterLink>
    </nav>
    <div class="header-user">
      <RouterLink to="/account">{{ auth.user?.displayName }}</RouterLink>
      <button class="btn compact" :disabled="busy" @click="logout">{{ busy ? '退出中…' : '退出登录' }}</button>
    </div>
  </header>
  <p v-if="error" class="alert error header-error" role="alert">{{ error }}</p>
</template>
