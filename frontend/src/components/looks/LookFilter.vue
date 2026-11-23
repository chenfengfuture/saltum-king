<script setup>
import { useLookStore } from '../../stores/look.js'
const store = useLookStore()
const views = [{ label: '作为主款', value: 'hero' }, { label: '被其他主款搭配', value: 'used' }, { label: '全部参与', value: 'all' }]
const lines = [{ label: '全部叙事', value: '' }, { label: '日常', value: '日常' }, { label: '网球', value: '网球' }]
</script>
<template>
  <section class="filters" aria-label="搭配筛选">
    <div class="tabs">
      <button v-for="item in views" :key="item.value" class="btn" :class="{ active: store.view === item.value }" :aria-pressed="store.view === item.value" @click="store.setFilter({ view: item.value })">{{ item.label }}</button>
    </div>
    <div class="filter-inputs">
      <input :value="store.query" type="search" aria-label="搜索搭配" placeholder="搜索货号、颜色、搭配说明" @input="store.setFilter({ query: $event.target.value })" />
      <select :value="store.line" aria-label="叙事" @change="store.setFilter({ line: $event.target.value })">
        <option v-for="item in lines" :key="item.label" :value="item.value">{{ item.label }}</option>
      </select>
      <select :value="store.review" aria-label="复核状态" @change="store.setFilter({ review: $event.target.value })">
        <option value="">全部复核状态</option><option>已看图选配</option><option>规则候选</option>
      </select>
      <select v-if="store.sku" :value="store.color" aria-label="商品颜色" @change="store.setFilter({ color: $event.target.value })">
        <option value="">全部颜色</option><option v-for="item in store.bySku.get(store.sku)?.colors || []" :key="item.color">{{ item.color }}</option>
      </select>
    </div>
  </section>
</template>
