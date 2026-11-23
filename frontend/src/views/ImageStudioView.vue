<script setup>
import { ref } from 'vue'
import ImageJobForm from '../components/image/ImageJobForm.vue'
import ImageAssetList from '../components/image/ImageAssetList.vue'
const refresh = ref(0)
</script>
<template>
  <div class="content-top"><div><div class="eyebrow">IMAGE STUDIO</div><h1>图片任务</h1><p>先记录商品图片需求，后续再接入上传与生成。</p></div><span class="badge">图片功能待接入</span></div>
  <ImageJobForm @saved="refresh++" /><ImageAssetList :refresh="refresh" />
</template>
