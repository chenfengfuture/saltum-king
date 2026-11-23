<script setup>
defineProps({ count: { type: Number, default: 6 } })
</script>
<template>
  <div class="skeleton-grid" role="status" aria-label="正在加载数据" aria-busy="true">
    <div v-for="n in count" :key="n" class="skeleton-card">
      <div class="skeleton-block skeleton-title"></div>
      <div class="skeleton-block skeleton-image"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-block skeleton-short"></div>
    </div>
    <span class="sr-only">正在加载数据</span>
  </div>
</template>
