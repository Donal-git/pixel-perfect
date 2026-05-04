<script setup lang="ts">
interface Props {
  title: string
  description: string
  status: 'submitted' | 'draft'
  date: string
  isAnonymous?: boolean
  onViewResponses?: () => void
  onContinueDraft?: () => void
  onSubmitDraft?: () => void
}

defineProps<Props>()
</script>

<template>
  <div
    :class="{
      'border rounded-lg p-5 transition-all hover:shadow-lg': true,
      'bg-green-50 border-l-4 border-green-500': status === 'submitted',
      'bg-yellow-50 border-l-4 border-yellow-500': status === 'draft'
    }"
  >
    <div class="flex items-start justify-between gap-4">
      <!-- SURVEY INFO -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-3 flex-wrap">
          <h3 class="font-semibold text-foreground text-lg">{{ title }}</h3>
          <span
            v-if="status === 'submitted'"
            class="inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full whitespace-nowrap"
          >
            ✓ Envoyé
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full whitespace-nowrap"
          >
            ✎ Brouillon
          </span>
          <span
            v-if="isAnonymous"
            class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
            title="Ce sondage est anonyme"
          >
            👤 Anonyme
          </span>
        </div>

        <p class="text-sm text-muted-foreground mb-3">{{ description }}</p>

        <!-- METADATA -->
        <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            📅
            {{ status === 'submitted' ? 'Soumis le' : 'Sauvegardé le' }}
            <strong>{{ date }}</strong>
          </span>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="flex gap-2 flex-shrink-0 flex-wrap justify-end">
        <!-- SUBMITTED SURVEY ACTIONS -->
        <button
          v-if="status === 'submitted'"
          @click="onViewResponses"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm whitespace-nowrap"
          title="Voir vos réponses"
        >
          Voir réponses
        </button>

        <!-- DRAFT SURVEY ACTIONS -->
        <template v-else>
          <button
            @click="onContinueDraft"
            class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium text-sm whitespace-nowrap"
            title="Continuer à répondre au sondage"
          >
            Continuer
          </button>
          <button
            @click="onSubmitDraft"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm whitespace-nowrap"
            title="Envoyer votre réponse au GRH"
          >
            Envoyer
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
