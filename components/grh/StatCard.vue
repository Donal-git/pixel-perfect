<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition">
    <p class="text-sm text-gray-500">
      {{ title }}
    </p>

    <h3 class="mt-2 text-2xl font-bold text-gray-900">
      {{ value }}
    </h3>

    <p
      v-if="description"
      class="mt-2 text-sm text-gray-500"
    >
      {{ description }}
    </p>
  </div>
</template>