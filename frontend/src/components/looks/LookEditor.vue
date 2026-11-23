<script setup>
import { reactive, ref, watch } from 'vue'
import { useLookStore } from '../../stores/look.js'
import { lookApi } from '../../api/look.js'
const props = defineProps({ record: { type: Object, default: null } })
const emit = defineEmits(['saved', 'cancel'])
const store = useLookStore()
const form = reactive({ title: '', anchor_sku: '', anchor_color: '', narrative: '日常', review_status: '规则候选', summary: '', partners: [] })
const busy = ref(false)
const error = ref('')
watch(() => props.record, (record) => {
  Object.assign(form, { title: record?.title || '', anchor_sku: record?.anchor_sku || store.sku || '', anchor_color: record?.anchor_color || '',
    narrative: record?.narrative || '日常', review_status: record?.review_status || '规则候选', summary: record?.summary || '',
    partners: (record?.items || []).filter((item) => item.sku !== record.anchor_sku).map((item) => ({ ...item })) })
}, { immediate: true })
function colors(sku) { return store.bySku.get(sku)?.colors || [] }
async function save() {
  busy.value = true; error.value = ''
  try {
    const selectedColor = colors(form.anchor_sku).find((row) => row.color === form.anchor_color)
    const items = [{ sku: form.anchor_sku, color: form.anchor_color, role: '主款', image: selectedColor?.image || '' },
      ...form.partners.map((item) => ({ ...item, image: colors(item.sku).find((row) => row.color === item.color)?.image || '' }))]
    await lookApi.saveLook({ ...(props.record || {}), title: form.title, anchor_sku: form.anchor_sku, anchor_color: form.anchor_color,
      narrative: form.narrative, review_status: form.review_status, summary: form.summary, items })
    emit('saved')
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <form class="panel editor" @submit.prevent="save">
    <div class="section-heading"><h2>{{ record ? '编辑搭配' : '新建搭配' }}</h2><button class="btn compact" type="button" @click="emit('cancel')">收起</button></div>
    <div class="form-grid">
      <label class="span-two">搭配名称<input v-model="form.title" required maxlength="120" /></label>
      <label>主款货号<select v-model="form.anchor_sku" required @change="form.anchor_color = ''"><option value="" disabled>选择商品</option><option v-for="row in store.catalog" :key="row.sku" :value="row.sku">{{ row.sku }} · {{ row.name }}</option></select></label>
      <label>主款颜色<select v-model="form.anchor_color"><option value="">未指定</option><option v-for="row in colors(form.anchor_sku)" :key="row.color">{{ row.color }}</option></select></label>
      <label>叙事<select v-model="form.narrative"><option>日常</option><option>网球</option></select></label>
      <label>复核状态<select v-model="form.review_status"><option>规则候选</option><option>已看图选配</option></select></label>
      <label class="span-two">搭配说明<textarea v-model="form.summary" rows="3" maxlength="2000"></textarea></label>
    </div>
    <div class="section-heading"><h3>搭配单品</h3><button class="btn compact" type="button" :disabled="form.partners.length >= 19" @click="form.partners.push({ sku: '', color: '', role: '配款' })">添加单品</button></div>
    <div v-for="(item, index) in form.partners" :key="index" class="partner-row">
      <label>单品货号<select v-model="item.sku" required @change="item.color = ''"><option value="" disabled>选择商品</option><option v-for="row in store.catalog" :key="row.sku" :value="row.sku">{{ row.sku }} · {{ row.name }}</option></select></label>
      <label>单品颜色<select v-model="item.color"><option value="">未指定</option><option v-for="row in colors(item.sku)" :key="row.color">{{ row.color }}</option></select></label>
      <label>角色<input v-model="item.role" maxlength="40" /></label>
      <button class="btn compact" type="button" @click="form.partners.splice(index, 1)">移除</button>
    </div>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <button class="btn primary" :disabled="busy || !store.catalog.length">{{ busy ? '保存中…' : '保存搭配' }}</button>
    <p v-if="!store.catalog.length" class="form-note">请先由管理员在商品目录中添加商品。</p>
  </form>
</template>
