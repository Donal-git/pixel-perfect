<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, Clock, Archive, BarChart2 } from 'lucide-vue-next'

interface SurveySynthesis {
  total: number
  active: number
  draft: number
  closed: number
  avgQuestions: number
  deptsReached: number
  avgParticipation: number
}

const props = defineProps<{
  synthesis: SurveySynthesis
}>()

const pct = (n: number) =>
  props.synthesis.total > 0 ? Math.round((n / props.synthesis.total) * 100) : 0

const statusRows = computed(() => [
  {
    key: 'active',
    label: 'Actifs',
    count: props.synthesis.active,
    pct: pct(props.synthesis.active),
    bar: 'bg-green-500',
    text: 'text-green-700',
    bg: 'bg-green-50',
    icon: CheckCircle2
  },
  {
    key: 'draft',
    label: 'Brouillons',
    count: props.synthesis.draft,
    pct: pct(props.synthesis.draft),
    bar: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: Clock
  },
  {
    key: 'closed',
    label: 'Fermés',
    count: props.synthesis.closed,
    pct: pct(props.synthesis.closed),
    bar: 'bg-gray-400',
    text: 'text-gray-500',
    bg: 'bg-gray-50',
    icon: Archive
  }
])
</script>

<template>
  <div class="rounded-xl border bg-white p-5 shadow-sm">

    <!-- Header -->
    <div class="mb-5">
      <h2 class="text-base font-semibold text-gray-900">Synthèse des sondages</h2>
      <p class="mt-0.5 text-xs text-gray-400">Répartition par statut et indicateurs clés</p>
    </div>

    <!-- État vide -->
    <div
      v-if="synthesis.total === 0"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <BarChart2 class="h-6 w-6 text-gray-300" />
      </div>
      <p class="mt-3 text-sm font-medium text-gray-500">Aucun sondage créé</p>
      <NuxtLink
        to="/grh/surveys/create"
        class="mt-3 text-xs text-blue-600 underline hover:text-blue-700"
      >
        Créer votre premier sondage →
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Distribution par statut -->
      <div class="mb-5 space-y-3">
        <div v-for="row in statusRows" :key="row.key">
          <div class="mb-1.5 flex items-center justify-between text-sm">
            <span class="flex items-center gap-1.5 font-medium text-gray-700">
              <component :is="row.icon" class="h-3.5 w-3.5" :class="row.text" />
              {{ row.label }}
            </span>
            <span class="font-semibold" :class="row.text">
              {{ row.count }}
              <span class="text-xs font-normal text-gray-400 ml-1">({{ row.pct }}%)</span>
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="row.bar"
              :style="{ width: `${row.pct}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Indicateurs clés -->
      <div class="grid grid-cols-3 gap-3 border-t pt-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900">{{ synthesis.total }}</p>
          <p class="mt-0.5 text-xs text-gray-500 leading-tight">Sondages<br>créés</p>
        </div>
        <div class="border-x text-center">
          <p class="text-2xl font-bold text-gray-900">{{ synthesis.avgQuestions }}</p>
          <p class="mt-0.5 text-xs text-gray-500 leading-tight">Questions<br>en moy.</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900">{{ synthesis.deptsReached }}</p>
          <p class="mt-0.5 text-xs text-gray-500 leading-tight">Dép.<br>touchés</p>
        </div>
      </div>

      <!-- Taux de participation moyen -->
      <div
        v-if="synthesis.avgParticipation > 0"
        class="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3"
      >
        <span class="text-sm font-medium text-blue-800">Participation estimée globale</span>
        <span class="text-lg font-bold text-blue-700">{{ synthesis.avgParticipation }}%</span>
      </div>
    </template>

  </div>
</template>
