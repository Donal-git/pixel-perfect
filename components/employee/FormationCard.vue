<script setup lang="ts" generic="T extends { id: string; title: string; description?: string; category?: string; duration?: string; level?: string; status?: string }">
import { computed } from 'vue'

interface Props {
  formation: T
  isRegistered: boolean
  onRegister: () => void
  onUnregister: () => void
}

const props = withDefaults(defineProps<Props>(), {})

const levelClass = computed(() => {
  const level = props.formation.level as string
  return {
    'px-2 py-1 rounded text-xs font-medium': true,
    'bg-green-100 text-green-800': level === 'débutant',
    'bg-yellow-100 text-yellow-800': level === 'intermédiaire',
    'bg-red-100 text-red-800': level === 'avancé'
  }
})

const statusClass = computed(() => {
  const status = props.formation.status as string
  return {
    'text-xs font-medium px-2 py-1 rounded': true,
    'bg-green-100 text-green-800': status === 'disponible',
    'bg-blue-100 text-blue-800': status === 'en_cours',
    'bg-gray-100 text-gray-800': status === 'terminée'
  }
})
</script>

<template>
  <div class="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-transparent hover:shadow-md transition">
    <!-- Header -->
    <div class="mb-3">
      <h3 class="font-semibold text-foreground">{{ formation.title }}</h3>
      <p class="text-xs text-muted-foreground mt-1">{{ formation.category }}</p>
    </div>

    <!-- Description -->
    <p class="text-sm text-muted-foreground mb-3 line-clamp-2">{{ formation.description }}</p>

    <!-- Details -->
    <div class="space-y-2 mb-4 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Durée:</span>
        <span class="font-medium">{{ formation.duration }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Niveau:</span>
        <span :class="levelClass">{{ formation.level }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Statut:</span>
        <span :class="statusClass">{{ formation.status }}</span>
      </div>
    </div>

    <!-- Action Button -->
    <button
      @click="isRegistered ? onUnregister() : onRegister()"
      :class="{
        'w-full px-3 py-2 rounded-lg font-medium transition text-sm': true,
        'bg-primary text-primary-foreground hover:bg-primary/90': !isRegistered,
        'bg-red-100 text-red-800 hover:bg-red-200': isRegistered
      }"
    >
      {{ isRegistered ? '✓ Se désinscrire' : 'S\'inscrire' }}
    </button>
  </div>
</template>
