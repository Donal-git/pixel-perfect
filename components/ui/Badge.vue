<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
    :class="variantClass"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
const props = defineProps({
  variant: { type: String, default: 'default' }
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-gray-100 text-gray-700'
    case 'destructive':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-teal-50 text-teal-700'
  }
})
</script>