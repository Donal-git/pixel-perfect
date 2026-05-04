<script setup lang="ts">
import { computed } from 'vue'

interface DeptParticipation {
  name: string
  rate: number
  surveysCount: number
  activeCount: number
}

const props = defineProps<{
  departments: DeptParticipation[]
}>()

const barColor = (rate: number) => {
  if (rate >= 80) return 'bg-green-500'
  if (rate >= 65) return 'bg-amber-400'
  return 'bg-red-400'
}

const rateColor = (rate: number) => {
  if (rate >= 80) return 'text-green-700'
  if (rate >= 65) return 'text-amber-700'
  return 'text-red-600'
}

const avgRate = computed(() => {
  if (!props.departments.length) return 0
  return Math.round(
    props.departments.reduce((a, d) => a + d.rate, 0) / props.departments.length
  )
})
</script>

<template>
  <div class="rounded-xl border bg-white p-5 shadow-sm">

    <!-- Header -->
    <div class="mb-5 flex items-start justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Participation par département</h2>
        <p class="mt-0.5 text-xs text-gray-400">Taux de réponse estimé — basé sur les sondages envoyés</p>
      </div>
      <div v-if="departments.length > 0" class="text-right">
        <p class="text-xl font-bold" :class="rateColor(avgRate)">{{ avgRate }}%</p>
        <p class="text-xs text-gray-400">moyenne</p>
      </div>
    </div>

    <!-- Légende -->
    <div v-if="departments.length > 0" class="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
        Bon (≥ 80 %)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
        Moyen (65–79 %)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2 w-2 rounded-full bg-red-400"></span>
        Faible (< 65 %)
      </span>
    </div>

    <!-- État vide -->
    <div
      v-if="departments.length === 0"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <svg class="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p class="mt-3 text-sm font-medium text-gray-500">Aucune donnée de participation</p>
      <p class="mt-1 text-xs text-gray-400">
        Les taux apparaîtront après l'envoi de sondages aux départements
      </p>
    </div>

    <!-- Barres par département -->
    <div v-else class="space-y-4">
      <div v-for="dept in departments" :key="dept.name">
        <div class="mb-1.5 flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <!-- Initiale département -->
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
              :class="barColor(dept.rate)"
            >
              {{ dept.name[0] }}
            </div>
            <span class="font-medium text-gray-800">{{ dept.name }}</span>
            <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {{ dept.surveysCount }} sondage{{ dept.surveysCount > 1 ? 's' : '' }}
            </span>
            <span
              v-if="dept.activeCount > 0"
              class="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700"
            >
              {{ dept.activeCount }} actif{{ dept.activeCount > 1 ? 's' : '' }}
            </span>
          </div>
          <span class="font-bold" :class="rateColor(dept.rate)">{{ dept.rate }}%</span>
        </div>

        <div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :class="barColor(dept.rate)"
            :style="{ width: `${dept.rate}%` }"
          />
        </div>
      </div>
    </div>

  </div>
</template>
