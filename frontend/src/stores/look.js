import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { lookApi } from '../api/look.js'
import { filterLooks } from '../utils/filters.js'

const PAGE_SIZE = 8
export const useLookStore = defineStore('look', () => {
  const looks = ref([])
  const catalog = ref([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const sku = ref('')
  const color = ref('')
  const line = ref('')
  const view = ref('hero')
  const review = ref('')
  const query = ref('')
  const page = ref(1)
  let generation = 0
  let pending
  const bySku = computed(() => new Map(catalog.value.map((product) => [product.sku, product])))
  const totals = computed(() => {
    const counts = new Map()
    for (const row of looks.value) counts.set(row.anchor_sku, (counts.get(row.anchor_sku) || 0) + 1)
    return counts
  })
  const matchedLooks = computed(() => filterLooks(looks.value, {
    sku: sku.value, color: color.value, line: line.value, view: view.value, review: review.value, query: query.value,
  }))
  const pageCount = computed(() => Math.max(1, Math.ceil(matchedLooks.value.length / PAGE_SIZE)))
  const currentPage = computed(() => Math.min(page.value, pageCount.value))
  const filteredLooks = computed(() => matchedLooks.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE))

  async function loadAll() {
    if (pending) return pending
    const version = generation
    loading.value = true
    error.value = ''
    pending = (async () => {
      try {
        const [lookRows, catalogRows] = await Promise.all([lookApi.fetchLooks(), lookApi.fetchCatalog()])
        if (generation !== version) return false
        looks.value = lookRows
        catalog.value = catalogRows
        loaded.value = true
        return true
      } catch (e) { if (generation === version) error.value = e.message; return false }
      finally { if (generation === version) { loading.value = false; pending = null } }
    })()
    return pending
  }
  function ensureLoaded() { if (!loaded.value) return loadAll() }
  function setFilter(patch) {
    if (patch.sku !== undefined && patch.sku !== sku.value) color.value = ''
    const refs = { sku, color, line, view, review, query }
    for (const [key, value] of Object.entries(patch)) if (refs[key]) refs[key].value = value
    page.value = 1
  }
  function reset() {
    generation++
    pending = null
    looks.value = []; catalog.value = []; loaded.value = false; loading.value = false; error.value = ''
    setFilter({ sku: '', color: '', line: '', view: 'hero', review: '', query: '' })
  }
  return { looks, catalog, loading, loaded, error, sku, color, line, view, review, query, page,
    bySku, totals, matchedLooks, pageCount, currentPage, filteredLooks, loadAll, ensureLoaded, setFilter, reset }
})
