<script setup lang="ts" generic="T extends { id: string; title: string; description?: string; status?: string; isAnonymous?: boolean }">
import { computed } from 'vue'

interface Props {
  survey: T
  hasResponded: boolean
  onRespond: () => void
}

const props = withDefaults(defineProps<Props>(), {})

const statusClass = computed(() => {
  const status = props.survey.status as string
  return {
    'text-xs font-medium px-2 py-1 rounded': true,
    'bg-green-100 text-green-800': status === 'active',
    'bg-yellow-100 text-yellow-800': status === 'draft',
    'bg-gray-100 text-gray-800': status === 'closed'
  }
})

const statusLabel = computed(() => {
  const status = props.survey.status as string
  return status === 'active' ? '🟢 Actif' : status === 'draft' ? '📋 Brouillon' : '🔴 Fermé'
})
</script>

<template>
  <div class="border rounded-lg p-4 hover:bg-accent transition flex items-center justify-between">
    <div class="flex-1">
      <h3 class="font-medium text-foreground">{{ survey.title }}</h3>
      <p class="text-sm text-muted-foreground mt-1">{{ survey.description }}</p>
      <div class="flex items-center gap-2 mt-2">
        <span v-if="hasResponded" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          ✓ Répondu
        </span>
        <span v-else class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
          En attente de réponse
        </span>
        <span v-if="survey.isAnonymous" class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          👤 Anonyme
        </span>
        <span :class="statusClass">{{ statusLabel }}</span>
      </div>
    </div>
    <button
      @click="onRespond()"
      :disabled="hasResponded"
      class="ml-4 px-4 py-2 rounded-lg font-medium transition"
      :class="
        hasResponded
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      "
    >
      {{ hasResponded ? 'Complété' : 'Répondre' }}
    </button>
  </div>
</template>
