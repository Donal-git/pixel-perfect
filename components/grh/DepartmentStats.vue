<script setup lang="ts">
import { computed } from 'vue'
import { Send, GraduationCap, Users } from 'lucide-vue-next'

interface DeptActivity {
  name: string
  surveysReceived: number
  formations: number
  participants: number
}

const props = defineProps<{
  departments: DeptActivity[]
}>()

const maxScore = computed(() =>
  Math.max(...props.departments.map(d => d.participants + d.surveysReceived * 10), 1)
)

/** Heatmap color based on engagement score */
const avatarColor = (d: DeptActivity) => {
  const score = d.participants + d.surveysReceived * 10
  const pct = (score / maxScore.value) * 100
  if (pct >= 66) return 'bg-teal-600'
  if (pct >= 33) return 'bg-teal-400'
  return 'bg-slate-300'
}

const engagementLabel = (d: DeptActivity) => {
  const score = d.participants + d.surveysReceived * 10
  const pct = (score / maxScore.value) * 100
  if (pct >= 66) return { text: 'Très actif', class: 'bg-teal-50 text-teal-700' }
  if (pct >= 33) return { text: 'Actif', class: 'bg-green-100 text-green-700' }
  return { text: 'Peu actif', class: 'bg-gray-100 text-gray-500' }
}
</script>

<template>
  <div class="rounded-xl border bg-white p-5 shadow-sm">

    <!-- Header -->
    <div class="mb-5">
      <h2 class="text-base font-semibold text-gray-900">Activité par département</h2>
      <p class="mt-0.5 text-xs text-gray-400">
        Croisement sondages reçus × formations inscrites
      </p>
    </div>

    <!-- État vide -->
    <div
      v-if="departments.length === 0"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <Users class="h-6 w-6 text-gray-300" />
      </div>
      <p class="mt-3 text-sm font-medium text-gray-500">Aucune donnée disponible</p>
      <p class="mt-1 text-xs text-gray-400">
        Envoyez des sondages ou créez des formations pour voir l'activité
      </p>
    </div>

    <!-- Liste des départements -->
    <div v-else class="space-y-2">
      <div
        v-for="dept in departments"
        :key="dept.name"
        class="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 transition hover:bg-gray-50"
      >
        <!-- Avatar initiale -->
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white transition"
          :class="avatarColor(dept)"
        >
          {{ dept.name[0] }}
        </div>

        <!-- Nom + métriques -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-800">{{ dept.name }}</p>
          <div class="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span class="flex items-center gap-1">
              <Send class="h-3 w-3" />
              {{ dept.surveysReceived }} sondage{{ dept.surveysReceived > 1 ? 's' : '' }}
            </span>
            <span class="flex items-center gap-1">
              <GraduationCap class="h-3 w-3" />
              {{ dept.formations }} formation{{ dept.formations > 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Score participants + badge -->
        <div class="shrink-0 text-right">
          <p class="text-sm font-bold text-gray-900">{{ dept.participants }}</p>
          <p class="text-xs text-gray-400">participants</p>
        </div>

        <span
          class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          :class="engagementLabel(dept).class"
        >
          {{ engagementLabel(dept).text }}
        </span>
      </div>
    </div>

  </div>
</template>
