<script setup>
import { computed, ref, watch } from 'vue'
import { assetUrl } from '../../utils/image.js'
const props = defineProps({ image: { type: String, default: '' }, alt: { type: String, default: '商品图片' } })
const failed = ref(false)
const url = computed(() => assetUrl(props.image))
watch(url, () => { failed.value = false })
</script>
<template>
  <img v-if="url && !failed" :src="url" :alt="alt" loading="lazy" @error="failed = true" />
  <div v-else class="image-placeholder" :aria-label="alt + '：图片待接入'" role="img"><span>图片待接入</span></div>
</template>
