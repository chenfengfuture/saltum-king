<script setup>
import { reactive, ref } from 'vue'
import { imageApi } from '../../api/look.js'
const emit = defineEmits(['saved'])
const form = reactive({ sku: '', title: '', category: '', quality: 'high', note: '' })
const error = ref('')
const busy = ref(false)
async function submit() {
  error.value = ''; busy.value = true
  try { await imageApi.createJob(form); Object.assign(form, { sku: '', title: '', category: '', quality: 'high', note: '' }); emit('saved') }
  catch (e) { error.value = e.message } finally { busy.value = false }
}
</script>
<template>
  <form class="panel" @submit.prevent="submit">
    <h2>记录图片需求</h2><div class="form-grid">
      <label>商品货号<input v-model="form.sku" required maxlength="80" placeholder="例如 J566" /></label>
      <label>商品名称<input v-model="form.title" maxlength="120" /></label>
      <label>品类<input v-model="form.category" maxlength="60" /></label>
      <label>目标画质<select v-model="form.quality"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
      <label class="span-two">需求备注<textarea v-model="form.note" maxlength="1000" rows="3" placeholder="记录角度、配色与细节要求"></textarea></label>
    </div>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <button class="btn primary" :disabled="busy">{{ busy ? '保存中…' : '保存任务草稿' }}</button>
    <p class="form-note">当前只保存任务信息。图片上传和生成接入后再启用。</p>
  </form>
</template>
