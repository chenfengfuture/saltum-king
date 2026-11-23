<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref(auth.error)
const busy = ref(false)
async function submit() {
  error.value = ''; busy.value = true
  try {
    await auth.login(username.value, password.value)
    password.value = ''
    const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : '/'
    await router.replace(target === '/login' ? '/' : target)
  } catch (e) { error.value = e.message; password.value = '' }
  finally { busy.value = false }
}
</script>
<template>
  <main class="login-page">
    <section class="login-intro"><div class="eyebrow">SALTUM · KING</div><h1>从产品到搭配。<br />让每一份灵感有据可寻。</h1><p>商品、配色与搭配记录，集中在一个工作台。</p></section>
    <form class="login-card" @submit.prevent="submit">
      <div class="eyebrow">WORKSPACE</div><h2>登录工作台</h2><p class="muted">使用管理员分配的账号登录。</p>
      <p v-if="route.query.changed" class="alert success">密码已更新，请重新登录。</p>
      <label>账号<input v-model="username" required autocomplete="username" maxlength="64" placeholder="请输入账号" /></label>
      <label>密码<input v-model="password" required type="password" autocomplete="current-password" maxlength="128" placeholder="请输入密码" /></label>
      <p v-if="error" class="alert error" role="alert">{{ error }}</p>
      <button class="btn primary" type="submit" :disabled="busy">{{ busy ? '正在登录…' : '登录' }}</button>
      <p class="form-note">没有账号或忘记密码？请联系管理员。</p>
    </form>
  </main>
</template>
