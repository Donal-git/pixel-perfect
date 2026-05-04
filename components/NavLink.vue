<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{
  to: string
}>()

const route = useRoute()
const isActive = computed(() => route.path === props.to)
</script>


<template>
  <NuxtLink :to="props.to" :class="cn('nav-link', isActive ? 'nav-link-active bg-primary/10 text-primary' : '')">
    <slot />
  </NuxtLink>
</template>


<style scoped>
.nav-link {
  text-decoration: none;
}
</style>