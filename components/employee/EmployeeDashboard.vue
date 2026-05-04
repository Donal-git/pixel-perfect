<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { useRouter } from 'vue-router'

// 🧭 Navigation
const router = useRouter()

// 📦 Stores
const authStore = useAuthStore()
const surveyStore = useSurveyStore()
const formationStore = useFormationStore()

// 👤 Current User
const currentUser = computed(() => authStore.user)

// 📊 Data
const surveys = ref<any[]>([])
const formations = ref<any[]>([])
const myFormations = ref<any[]>([])
const respondedSurveys = ref<Set<string>>(new Set())

// Loading state
const loading = ref(true)

// 🔄 Fetch data on mount
onMounted(async () => {
  loading.value = true
  try {
    // Load stores
    surveyStore.loadFromStorage()
    surveyStore.loadResponsesFromStorage()
    formationStore.loadFromStorage()
    formationStore.loadRegistrationsFromStorage()

    // Get active surveys
    surveys.value = surveyStore.activeSurveys

    // Get available formations
    formations.value = formationStore.availableFormations

    // Get employee's registered formations
    if (currentUser.value?.id) {
      myFormations.value = formationStore.getEmployeeFormations(currentUser.value.id)

      // Check which surveys have been answered
      surveys.value.forEach((survey) => {
        if (surveyStore.hasEmployeeResponded(survey.id, currentUser.value!.id)) {
          respondedSurveys.value.add(survey.id)
        }
      })
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
})

// 📝 Navigate to survey response
const goToSurvey = (surveyId: string) => {
  router.push(`/surveys/${surveyId}/response`)
}

// 📚 Register for formation
const registerForFormation = (formationId: string) => {
  if (currentUser.value?.id) {
    formationStore.registerForFormation(formationId, currentUser.value.id)
    // Update my formations list
    myFormations.value = formationStore.getEmployeeFormations(currentUser.value.id)
  }
}

// 📚 Unregister from formation
const unregisterFromFormation = (formationId: string) => {
  if (currentUser.value?.id) {
    formationStore.unregisterFromFormation(formationId, currentUser.value.id)
    // Update my formations list
    myFormations.value = formationStore.getEmployeeFormations(currentUser.value.id)
  }
}

// 👤 Navigate to profile
const goToProfile = () => {
  if (currentUser.value?.id) {
    router.push(`/employee/profile`)
  }
}

// 📋 Navigate to my surveys
const goToMySurveys = () => {
  router.push('/employee/surveys')
}

// 📊 Computed stats
const stats = computed(() => ({
  surveysPending: surveys.value.filter(s => !respondedSurveys.value.has(s.id)).length,
  surveysCompleted: respondedSurveys.value.size,
  totalSurveys: surveys.value.length,
  formationsRegistered: myFormations.value.length,
  formationsAvailable: formations.value.length
}))

// Check if employee is registered
const isRegisteredForFormation = (formationId: string) => {
  if (!currentUser.value?.id) return false
  return formationStore.isEmployeeRegistered(formationId, currentUser.value.id)
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold text-foreground">Mon Espace Employé</h1>
        <p class="text-muted-foreground mt-1">
          Bienvenue {{ currentUser?.name }}, gérez vos sondages et formations
        </p>
      </div>
      <div class="flex gap-2">
        <button
          @click="goToMySurveys"
          class="px-4 py-2 border rounded-lg hover:bg-accent transition font-medium"
        >
          📋 Mes Sondages
        </button>
        <button
          @click="goToProfile"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
        >
          Mon Profil
        </button>
      </div>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-muted-foreground">Chargement de vos données...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- STATS CARDS -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div class="border rounded-lg p-4 bg-card">
          <p class="text-sm text-muted-foreground font-medium">Sondages en attente</p>
          <p class="text-2xl font-bold mt-2">{{ stats.surveysPending }}</p>
          <p class="text-xs text-muted-foreground mt-1">sur {{ stats.totalSurveys }}</p>
        </div>

        <div class="border rounded-lg p-4 bg-card">
          <p class="text-sm text-muted-foreground font-medium">Sondages répondus</p>
          <p class="text-2xl font-bold mt-2">{{ stats.surveysCompleted }}</p>
          <p class="text-xs text-muted-foreground mt-1">complétés</p>
        </div>

        <div class="border rounded-lg p-4 bg-card">
          <p class="text-sm text-muted-foreground font-medium">Mes formations</p>
          <p class="text-2xl font-bold mt-2">{{ stats.formationsRegistered }}</p>
          <p class="text-xs text-muted-foreground mt-1">inscriptions</p>
        </div>

        <div class="border rounded-lg p-4 bg-card">
          <p class="text-sm text-muted-foreground font-medium">Formations disponibles</p>
          <p class="text-2xl font-bold mt-2">{{ stats.formationsAvailable }}</p>
          <p class="text-xs text-muted-foreground mt-1">à explorer</p>
        </div>

        <div class="border rounded-lg p-4 bg-card">
          <p class="text-sm text-muted-foreground font-medium">Profil</p>
          <p class="text-2xl font-bold mt-2">{{ currentUser?.accountType || '—' }}</p>
          <p class="text-xs text-muted-foreground mt-1">rôle</p>
        </div>
      </div>

      <!-- SURVEYS SECTION -->
      <div class="border rounded-xl p-6 bg-card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">📋 Sondages</h2>
          <span class="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
            {{ stats.surveysPending }} en attente
          </span>
        </div>

        <!-- EMPTY STATE -->
        <div v-if="surveys.length === 0" class="py-8 text-center">
          <p class="text-muted-foreground">Aucun sondage disponible pour le moment</p>
        </div>

        <!-- SURVEYS LIST -->
        <div v-else class="space-y-3">
          <div
            v-for="survey in surveys"
            :key="survey.id"
            class="border rounded-lg p-4 hover:bg-accent transition flex items-center justify-between"
          >
            <div class="flex-1">
              <h3 class="font-medium text-foreground">{{ survey.title }}</h3>
              <p class="text-sm text-muted-foreground mt-1">{{ survey.description }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span
                  v-if="respondedSurveys.has(survey.id)"
                  class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                >
                  ✓ Répondu
                </span>
                <span v-else class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  En attente de réponse
                </span>
              </div>
            </div>
            <button
              @click="goToSurvey(survey.id)"
              :disabled="respondedSurveys.has(survey.id)"
              class="ml-4 px-4 py-2 rounded-lg font-medium transition"
              :class="
                respondedSurveys.has(survey.id)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              "
            >
              {{ respondedSurveys.has(survey.id) ? 'Complété' : 'Répondre' }}
            </button>
          </div>
        </div>
      </div>

      <!-- FORMATIONS AVAILABLE SECTION -->
      <div class="border rounded-xl p-6 bg-card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">📚 Formations Disponibles</h2>
          <span class="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
            {{ formations.length }} disponibles
          </span>
        </div>

        <!-- EMPTY STATE -->
        <div v-if="formations.length === 0" class="py-8 text-center">
          <p class="text-muted-foreground">Aucune formation disponible pour le moment</p>
        </div>

        <!-- FORMATIONS LIST -->
        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="formation in formations"
            :key="formation.id"
            class="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-transparent hover:shadow-md transition"
          >
            <div class="mb-3">
              <h3 class="font-semibold text-foreground">{{ formation.title }}</h3>
              <p class="text-xs text-muted-foreground mt-1">{{ formation.category }}</p>
            </div>

            <p class="text-sm text-muted-foreground mb-3">{{ formation.description }}</p>

            <div class="space-y-2 mb-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Durée:</span>
                <span class="font-medium">{{ formation.duration }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Niveau:</span>
                <span
                  :class="{
                    'px-2 py-1 rounded text-xs font-medium': true,
                    'bg-green-100 text-green-800': formation.level === 'débutant',
                    'bg-yellow-100 text-yellow-800': formation.level === 'intermédiaire',
                    'bg-red-100 text-red-800': formation.level === 'avancé'
                  }"
                >
                  {{ formation.level }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Participants:</span>
                <span class="font-medium">{{ formation.participants }}</span>
              </div>
            </div>

            <button
              @click="
                isRegisteredForFormation(formation.id)
                  ? unregisterFromFormation(formation.id)
                  : registerForFormation(formation.id)
              "
              :class="{
                'w-full px-3 py-2 rounded-lg font-medium transition text-sm': true,
                'bg-primary text-primary-foreground hover:bg-primary/90': !isRegisteredForFormation(formation.id),
                'bg-red-100 text-red-800 hover:bg-red-200': isRegisteredForFormation(formation.id)
              }"
            >
              {{ isRegisteredForFormation(formation.id) ? '✓ Se désinscrire' : 'S\'inscrire' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MY FORMATIONS SECTION -->
      <div v-if="myFormations.length > 0" class="border rounded-xl p-6 bg-card">
        <h2 class="text-xl font-semibold mb-4">📖 Mes Formations Inscrites</h2>

        <div class="space-y-3">
          <div
            v-for="formation in myFormations"
            :key="formation.id"
            class="border-l-4 border-green-500 p-4 bg-green-50 rounded-r-lg"
          >
            <h3 class="font-medium text-foreground">{{ formation.title }}</h3>
            <p class="text-sm text-muted-foreground mt-1">{{ formation.description }}</p>
            <div class="flex items-center gap-2 mt-2 text-sm">
              <span class="text-muted-foreground">📅 Durée:</span>
              <span class="font-medium">{{ formation.duration }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>