<script setup>
import { computed, ref } from 'vue'
import { useLookStore } from '../../stores/look.js'
import ProductImage from '../shared/ProductImage.vue'
const store = useLookStore()
const keyword = ref('')
const category = ref('')
const categories = computed(() => [...new Set(store.catalog.map((row) => row.category).filter(Boolean))])
const rows = computed(() => store.catalog.filter((row) => {
  return (!category.value || row.category === category.value) &&
    [row.sku, row.name, ...row.colors.map((color) => color.color)].join(' ').toLowerCase().includes(keyword.value.toLowerCase())
}))
</script>
<template>
  <aside class="sidebar">
    <div class="side-head">
      <div class="side-title">商品货号 <small>{{ store.catalog.length }} 款</small></div>
      <input v-model="keyword" type="search" aria-label="搜索商品" placeholder="搜索货号、品名、颜色" />
      <select v-model="category" aria-label="商品品类">
        <option value="">全部品类</option><option v-for="item in categories" :key="item">{{ item }}</option>
      </select>
    </div>
    <nav class="product-list" aria-label="按商品筛选">
      <button class="product-row all-row" :class="{ active: !store.sku }" @click="store.setFilter({ sku: '' })">全部商品</button>
      <button v-for="product in rows" :key="product.sku" class="product-row" :class="{ active: store.sku === product.sku }" @click="store.setFilter({ sku: product.sku })">
        <ProductImage :image="product.colors[0]?.image" :alt="product.name" />
        <span><b class="code">{{ product.sku }}</b><span class="name">{{ product.name }}</span></span>
      </button>
      <p v-if="!store.loading && !rows.length" class="side-empty">暂无商品</p>
    </nav>
  </aside>
</template>
