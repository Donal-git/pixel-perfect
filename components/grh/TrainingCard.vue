<script setup lang="ts">
import { computed } from 'vue'
import { GraduationCap } from 'lucide-vue-next'

interface CategoryNeed {
  category: string
  count: number
  participants: number
  available: number
}

const props = defineProps<{
  categories: CategoryNeed[]
}>()

const maxParticipants = computed(() =>
  Math.max(...props.categories.map(c => c.participants), 1)
)

const totalParticipants = computed(() =>
  props.categories.reduce((a, c) => a + c.participants, 0)
)

</script>

<template>
  <div class="rounded-xl border bg-white p-5 shadow-sm">

    <!-- Header -->
    <div class="mb-5 flex items-start justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Besoins en formation</h2>
        <p class="mt-0.5 text-xs text-gray-400">Demande par catégorie — participants inscrits</p>
      </div>
      <div v-if="categories.length > 0" class="text-right">
        <p class="text-xl font-bold text-gray-900">{{ totalParticipants }}</p>
        <p class="text-xs text-gray-400">participants</p>
      </div>
    </div>

    <!-- État vide -->
    <div
      v-if="categories.length === 0"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <GraduationCap class="h-6 w-6 text-gray-300" />
      </div>
      <p class="mt-3 text-sm font-medium text-gray-500">Aucune formation créée</p>
      <NuxtLink
        to="/grh/formations"
        class="mt-3 text-xs text-teal-600 underline hover:text-teal-700"
      >
        Gérer le catalogue →
      </NuxtLink>
    </div>

    <!-- Catégories -->
    <div v-else class="space-y-4">
      <div v-for="cat in categories" :key="cat.category">
        <div class="mb-1.5 flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <!-- Indicateur catégorie -->
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-bold text-white">
              {{ cat.category[0] }}
            </span>
            <span class="font-medium text-gray-800">{{ cat.category }}</span>
            <!-- Nombre de formations -->
            <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {{ cat.count }} formation{{ cat.count > 1 ? 's' : '' }}
            </span>
          </div>
          <span class="font-bold text-gray-700">{{ cat.participants }}</span>
        </div>

        <!-- Barre de demande -->
        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            class="h-full rounded-full bg-teal-500 transition-all duration-700 ease-out"
            :style="{ width: `${Math.round((cat.participants / maxParticipants) * 100)}%` }"
          />
        </div>

        <!-- Formations disponibles -->
        <p v-if="cat.available > 0" class="mt-0.5 text-xs text-green-600">
          {{ cat.available }} disponible{{ cat.available > 1 ? 's' : '' }} — inscriptions ouvertes
        </p>
      </div>
    </div>

    <!-- Lien vers formations -->
    <div v-if="categories.length > 0" class="mt-5 border-t pt-4">
      <NuxtLink
        to="/grh/formations"
        class="flex items-center justify-between text-sm font-medium text-teal-600 hover:text-teal-700"
      >
        <span>Gérer le catalogue complet</span>
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </NuxtLink>
    </div>

  </div>
</template>
