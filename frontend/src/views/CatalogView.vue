<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useLookStore } from '../stores/look.js'
import { useAuthStore } from '../stores/auth.js'
import { lookApi } from '../api/look.js'
import LoadingSkeleton from '../components/shared/LoadingSkeleton.vue'
const store = useLookStore()
const auth = useAuthStore()
const form = reactive({ sku: '', name: '', category: '', colors: '' })
const editing = ref(null)
const showForm = ref(false)
const busy = ref(false)
const error = ref('')
onMounted(() => store.ensureLoaded())
function edit(row = null) {
  editing.value = row; showForm.value = true; error.value = ''
  Object.assign(form, { sku: row?.sku || '', name: row?.name || '', category: row?.category || '', colors: row?.colors.map((c) => c.color).join('，') || '' })
}
async function save() {
  busy.value = true; error.value = ''
  try {
    const colors = form.colors.split(/[,，\n]/).map((v) => v.trim()).filter(Boolean).map((color) => ({
      ...(editing.value?.colors.find((row) => row.color === color) || {}), color,
    }))
    const body = { ...(editing.value || {}), sku: form.sku, name: form.name, category: form.category, colors }
    if (editing.value) await lookApi.updateProduct(body)
    else await lookApi.createProduct(body)
    showForm.value = false
    await store.loadAll()
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
async function remove(row) {
  if (!window.confirm('确认删除商品「' + row.sku + '」？')) return
  error.value = ''
  try { await lookApi.deleteProduct(row.sku); await store.loadAll() } catch (e) { error.value = e.message }
}
</script>
<template>
  <div class="content-top"><div><div class="eyebrow">PRODUCT LIBRARY</div><h1>商品目录</h1><p>维护货号、商品信息与配色。</p></div><button v-if="auth.isAdmin" class="btn primary" @click="edit()">新建商品</button></div>
  <form v-if="showForm" class="panel" @submit.prevent="save">
    <div class="section-heading"><h2>{{ editing ? '编辑商品' : '新建商品' }}</h2><button class="btn compact" type="button" @click="showForm = false">收起</button></div>
    <div class="form-grid">
      <label>商品货号<input v-model="form.sku" :readonly="!!editing" required maxlength="80" placeholder="如 J566" /></label>
      <label>商品名称<input v-model="form.name" required maxlength="120" /></label>
      <label>品类<input v-model="form.category" maxlength="60" placeholder="如 网球裙" /></label>
      <label>配色<input v-model="form.colors" placeholder="用逗号分隔，如 奶白，深绿" /></label>
    </div>
    <button class="btn primary" :disabled="busy">{{ busy ? '保存中…' : '保存商品' }}</button>
  </form>
  <p v-if="error" class="alert error" role="alert">{{ error }}</p>
  <LoadingSkeleton v-if="store.loading" :count="3" />
  <div v-else-if="store.error" class="alert error" role="alert">{{ store.error }} <button class="btn compact" @click="store.loadAll()">重试</button></div>
  <div v-else-if="store.catalog.length" class="table-wrap panel"><table><thead><tr><th>货号</th><th>商品名称</th><th>品类</th><th>配色</th><th v-if="auth.isAdmin">操作</th></tr></thead><tbody><tr v-for="row in store.catalog" :key="row.sku"><td><b>{{ row.sku }}</b></td><td>{{ row.name }}</td><td>{{ row.category || '—' }}</td><td>{{ row.colors.map((item) => item.color).join(' / ') || '—' }}</td><td v-if="auth.isAdmin" class="table-actions"><button class="btn compact" @click="edit(row)">编辑</button><button class="btn compact danger-text" @click="remove(row)">删除</button></td></tr></tbody></table></div>
  <section v-else class="empty"><h3>还没有商品</h3><p>{{ auth.isAdmin ? '添加第一个货号，开始建立商品目录。' : '商品目录由管理员维护，添加后会显示在这里。' }}</p></section>
</template>
