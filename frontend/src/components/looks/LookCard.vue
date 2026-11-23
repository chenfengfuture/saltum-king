<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import ProductImage from '../shared/ProductImage.vue'
const props = defineProps({ record: { type: Object, required: true }, focusSku: String })
defineEmits(['edit', 'delete'])
const auth = useAuthStore()
const canEdit = computed(() => auth.isAdmin || props.record.created_by === auth.user?.username)
</script>
<template>
  <article class="look">
    <div class="card-top"><span class="meta">{{ record.narrative }} / {{ record.anchor_sku }}</span><span class="badge">{{ record.review_status }}</span></div>
    <h3>{{ record.title }}</h3>
    <p class="muted">主款：{{ record.anchor_sku }} · {{ record.anchor_color || '未指定颜色' }}</p>
    <div class="products">
      <div v-for="(item, index) in record.items" :key="item.sku + ':' + index" class="product" :class="{ focus: item.sku === focusSku }">
        <ProductImage :image="item.image" :alt="item.sku + ' ' + item.color" />
        <span class="role">{{ item.role }}{{ item.optional ? ' · 可选' : '' }}</span><b>{{ item.sku }}</b><span class="color-label">{{ item.color }}</span>
      </div>
    </div>
    <p class="summary">{{ record.summary || '尚未填写搭配说明' }}</p>
    <div v-if="canEdit" class="card-actions"><button class="btn compact" @click="$emit('edit', record)">编辑搭配</button><button class="btn compact danger-text" @click="$emit('delete', record)">删除</button></div>
  </article>
</template>
