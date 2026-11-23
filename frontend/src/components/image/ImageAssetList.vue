<script setup>
import { ref, watch } from 'vue'
import { imageApi } from '../../api/look.js'
import { useAuthStore } from '../../stores/auth.js'
import LoadingSkeleton from '../shared/LoadingSkeleton.vue'
const props = defineProps({ refresh: { type: Number, default: 0 } })
const auth = useAuthStore()
const rows = ref([])
const error = ref('')
const loading = ref(true)
async function load() {
  error.value = ''; loading.value = true
  try { rows.value = await imageApi.listJobs() } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
watch(() => props.refresh, load, { immediate: true })
async function remove(row) {
  if (!window.confirm('确认删除这个任务草稿？')) return
  try { await imageApi.deleteJob(row.id); await load() } catch (e) { error.value = e.message }
}
</script>
<template>
  <section><h2>任务草稿</h2><p v-if="error" class="alert error" role="alert">{{ error }} <button class="btn compact" @click="load">重试</button></p>
    <LoadingSkeleton v-if="loading" :count="3" />
    <div v-else-if="rows.length" class="grid"><article v-for="row in rows" :key="row.id" class="panel task-card"><div class="card-top"><b>{{ row.sku }}</b><span class="badge">草稿</span></div><h3>{{ row.title || '未命名图片任务' }}</h3><p>{{ row.note || '暂无备注' }}</p><p class="muted">图片功能待接入</p><button v-if="auth.isAdmin || row.created_by === auth.user?.username" class="btn compact" @click="remove(row)">删除草稿</button></article></div>
    <div v-else-if="!error" class="empty">还没有图片任务草稿。</div>
  </section>
</template>
