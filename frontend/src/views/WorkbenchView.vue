<script setup>
import { ref, onMounted } from 'vue'
import { useLookStore } from '../stores/look.js'
import { lookApi } from '../api/look.js'
import LookFilter from '../components/looks/LookFilter.vue'
import LookCard from '../components/looks/LookCard.vue'
import LookEditor from '../components/looks/LookEditor.vue'
import LoadingSkeleton from '../components/shared/LoadingSkeleton.vue'
const store = useLookStore()
const editing = ref(false)
const record = ref(null)
const error = ref('')
onMounted(() => store.ensureLoaded())
function edit(row = null) { record.value = row; editing.value = true; error.value = '' }
async function saved() { editing.value = false; record.value = null; await store.loadAll() }
async function remove(row) {
  if (!window.confirm('确认删除搭配「' + row.title + '」？')) return
  error.value = ''
  try { await lookApi.deleteLook(row.id); await store.loadAll() } catch (e) { error.value = e.message }
}
</script>
<template>
  <div class="content-top"><div><div class="eyebrow">PRODUCT × OUTFIT</div><h1>货号搭配工作台</h1><p>以商品为起点，整理每一次搭配。</p></div><button class="btn primary" @click="edit()">新建搭配</button></div>
  <div class="overview"><span><b>{{ store.catalog.length }}</b>款商品</span><span><b>{{ store.looks.length }}</b>套搭配</span><span class="muted">日常 / 网球</span></div>
  <LookEditor v-if="editing" :key="record?.id || 'new'" :record="record" @saved="saved" @cancel="editing = false" />
  <LookFilter />
  <p v-if="error" class="alert error" role="alert">{{ error }}</p>
  <LoadingSkeleton v-if="store.loading" />
  <div v-else-if="store.error" class="alert error" role="alert">{{ store.error }} <button class="btn compact" @click="store.loadAll()">重试</button></div>
  <template v-else>
    <div class="results">共 {{ store.matchedLooks.length }} 套搭配</div>
    <div v-if="store.filteredLooks.length" class="grid"><LookCard v-for="row in store.filteredLooks" :key="row.id" :record="row" :focus-sku="store.sku" @edit="edit" @delete="remove" /></div>
    <section v-else class="empty"><h3>{{ store.looks.length ? '当前筛选下没有搭配' : '开始整理第一套搭配' }}</h3><p>{{ store.looks.length ? '试试其他货号、颜色或叙事。' : '先完善商品目录，再把单品组合成搭配记录。' }}</p><RouterLink v-if="!store.catalog.length" class="btn" to="/catalog">查看商品目录</RouterLink></section>
    <div v-if="store.pageCount > 1" class="pagination"><button class="btn" :disabled="store.currentPage <= 1" @click="store.page = store.currentPage - 1">上一页</button><span>{{ store.currentPage }} / {{ store.pageCount }}</span><button class="btn" :disabled="store.currentPage >= store.pageCount" @click="store.page = store.currentPage + 1">下一页</button></div>
  </template>
</template>
