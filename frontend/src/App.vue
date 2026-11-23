<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { useLookStore } from './stores/look.js'
import AppHeader from './components/layout/AppHeader.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import LoadingSkeleton from './components/shared/LoadingSkeleton.vue'
const route = useRoute()
const auth = useAuthStore()
const store = useLookStore()
watch(() => auth.user?.username, (name, previous) => {
  if (name !== previous) store.reset()
  if (name) store.ensureLoaded()
}, { immediate: true })
</script>

<template>
  <main v-if="!auth.ready" class="boot-screen"><LoadingSkeleton :count="3" /></main>
  <RouterView v-else-if="route.meta.public" />
  <template v-else>
    <AppHeader />
    <div class="workspace" :class="{ 'workspace-wide': route.name !== 'workbench' }">
      <AppSidebar v-if="route.name === 'workbench'" />
      <main class="content" id="main-content"><RouterView /></main>
    </div>
  </template>
</template>
