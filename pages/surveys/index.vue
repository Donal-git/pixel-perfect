<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

// 📦 STATE
const surveys = ref<any[]>([])
const role = ref<'admin' | 'grh' | 'employee'>('employee') // 👉 à connecter à ton store

// 🔄 FETCH (mock)
onMounted(async () => {
  // 👉 remplacer par API backend
  surveys.value = [
    {
      id: '1',
      title: 'Satisfaction employés',
      description: 'Donnez votre avis',
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Évaluation interne',
      description: 'Feedback annuel',
      status: 'draft',
      created_at: new Date().toISOString()
    }
  ]
})

// 👤 ROLE
const isManager = computed(() => {
  return role.value === 'admin' || role.value === 'grh'
})

// 🏷 STATUS
const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  active: "Actif",
  closed: "Fermé"
}

// 🚀 NAVIGATION
const goToCreate = () => navigateTo('/surveys/create')
const goToSurvey = (id: string) => navigateTo(`/survey/${id}`)
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Sondages</h1>
        <p class="text-gray-500">
          {{ isManager
            ? "Gérez et suivez vos sondages"
            : "Consultez les sondages disponibles"
          }}
        </p>
      </div>

      <!-- CREATE BUTTON -->
      <button
        v-if="isManager"
        @click="goToCreate"
        class="bg-black text-white px-4 py-2 rounded"
      >
        ➕ Nouveau sondage
      </button>
    </div>

    <!-- EMPTY -->
    <div v-if="surveys.length === 0" class="border p-8 text-center rounded">
      <p class="text-gray-500">Aucun sondage disponible</p>
    </div>

    <!-- LIST -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <div
        v-for="survey in surveys"
        :key="survey.id"
        class="border p-4 rounded hover:shadow transition"
      >

        <!-- HEADER CARD -->
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold">{{ survey.title }}</h3>

          <span
            class="text-xs px-2 py-1 rounded"
            :class="survey.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-600'"
          >
            {{ statusLabels[survey.status] || survey.status }}
          </span>
        </div>

        <!-- DESCRIPTION -->
        <p v-if="survey.description" class="text-sm text-gray-500 mb-3">
          {{ survey.description }}
        </p>

        <!-- FOOTER -->
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-400">
            {{ new Date(survey.created_at).toLocaleDateString('fr-FR') }}
          </span>

          <div class="flex gap-2">

            <!-- EMPLOYEE -->
            <button
              v-if="!isManager && survey.status === 'active'"
              @click="goToSurvey(survey.id)"
              class="text-blue-600 text-sm"
            >
              Répondre
            </button>

            <!-- MANAGER -->
            <button
              v-if="isManager"
              class="text-sm border px-2 py-1 rounded"
            >
              👁 Voir
            </button>

          </div>
        </div>

      </div>
    </div>

  </div>
</template>