<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
const auth = useAuthStore()
const router = useRouter()
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const busy = ref(false)
async function save() {
  error.value = ''
  if (newPassword.value !== confirmPassword.value) { error.value = '两次新密码输入不一致'; return }
  busy.value = true
  try { await auth.changePassword(currentPassword.value, newPassword.value); await router.replace('/login?changed=1') }
  catch (e) { error.value = e.message }
  finally { busy.value = false; currentPassword.value = ''; newPassword.value = ''; confirmPassword.value = '' }
}
</script>
<template>
  <div class="content-top"><div><div class="eyebrow">ACCOUNT</div><h1>个人账号</h1><p>{{ auth.user?.displayName }} · {{ auth.user?.username }}</p></div></div>
  <form class="panel account-form" @submit.prevent="save"><h2>修改密码</h2><p class="muted">修改后，所有设备都需要重新登录。</p>
    <label>当前密码<input v-model="currentPassword" type="password" required maxlength="128" autocomplete="current-password" /></label>
    <label>新密码<input v-model="newPassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password" /></label>
    <label>确认新密码<input v-model="confirmPassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password" /></label>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p><button class="btn primary" :disabled="busy">{{ busy ? '保存中…' : '更新密码' }}</button>
  </form>
</template>
