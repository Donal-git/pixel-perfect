<template>
  <button
    class="px-3 py-1 rounded border text-sm"
    :class="{ 'bg-black text-white': active }"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps({ active: Boolean })
defineEmits(['click'])
</script>