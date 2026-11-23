<script setup>
import { onMounted, reactive, ref } from 'vue'
import { memberApi } from '../api/look.js'
import LoadingSkeleton from '../components/shared/LoadingSkeleton.vue'
const rows = ref([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const form = reactive({ username: '', displayName: '', password: '' })
const resetTarget = ref(null)
const newPassword = ref('')
async function load() {
  loading.value = true
  try { rows.value = await memberApi.list() } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
onMounted(load)
async function create() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await memberApi.create(form)
    Object.assign(form, { username: '', displayName: '', password: '' })
    notice.value = '成员账号已创建。请将账号信息交给该成员。'
    await load()
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
async function toggle(row) {
  busy.value = true; error.value = ''; notice.value = ''
  try { await memberApi.update(row.username, { active: !row.active }); await load() }
  catch (e) { error.value = e.message } finally { busy.value = false }
}
async function resetPassword() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await memberApi.update(resetTarget.value.username, { password: newPassword.value })
    resetTarget.value = null; newPassword.value = ''; notice.value = '密码已重置，该成员需要重新登录。'
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <div class="content-top"><div><div class="eyebrow">TEAM</div><h1>成员管理</h1><p>创建成员账号，管理访问权限。</p></div></div>
  <form class="panel" @submit.prevent="create"><h2>创建成员</h2><div class="form-grid three">
    <label>成员账号<input v-model="form.username" required minlength="3" maxlength="64" autocomplete="off" placeholder="字母、数字或邮箱" /></label>
    <label>成员姓名<input v-model="form.displayName" required maxlength="60" /></label>
    <label>初始密码<input v-model="form.password" type="password" required minlength="10" maxlength="128" autocomplete="new-password" placeholder="至少 10 位" /></label>
  </div><button class="btn primary" :disabled="busy">{{ busy ? '处理中…' : '创建成员账号' }}</button></form>
  <form v-if="resetTarget" class="panel" @submit.prevent="resetPassword"><h2>重置 {{ resetTarget.displayName }} 的密码</h2><label>新密码<input v-model="newPassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password" /></label><div class="form-actions"><button class="btn primary" :disabled="busy">保存新密码</button><button class="btn" type="button" @click="resetTarget = null; newPassword = ''">取消</button></div></form>
  <p v-if="error" class="alert error" role="alert">{{ error }}</p><p v-if="notice" class="alert success" role="status">{{ notice }}</p>
  <LoadingSkeleton v-if="loading" :count="3" />
  <div v-else class="table-wrap panel"><table><thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>
    <tr v-for="row in rows" :key="row.username"><td>{{ row.username }}</td><td>{{ row.displayName }}</td><td>{{ row.role === 'admin' ? '管理员' : '成员' }}</td><td><span class="badge" :class="{ muted: !row.active }">{{ row.active ? '正常' : '已停用' }}</span></td><td class="table-actions"><template v-if="row.role === 'member'"><button class="btn compact" :disabled="busy" @click="toggle(row)">{{ row.active ? '停用' : '启用' }}</button><button class="btn compact" :disabled="busy" @click="resetTarget = row; newPassword = ''">重置密码</button></template><span v-else class="muted">在个人账号中修改密码</span></td></tr>
  </tbody></table></div>
</template>
