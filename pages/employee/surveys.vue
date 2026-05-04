<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSurveyStore } from '~/stores/survey'
import { useRouter } from 'vue-router'

// 🧭 Navigation
const router = useRouter()

// 📦 Stores
const authStore = useAuthStore()
const surveyStore = useSurveyStore()

// 👤 Current user
const currentUser = computed(() => authStore.user)

// 📊 State
const loading = ref(true)
const filterType = ref<'all' | 'submitted' | 'draft'>('all')
const showSuccessMessage = ref(false)
const successMessage = ref('')

// 📋 Data
const submittedSurveys = ref<any[]>([])
const draftSurveys = ref<any[]>([])

// 🔄 Load data
onMounted(async () => {
  loading.value = true
  try {
    surveyStore.loadFromStorage()
    surveyStore.loadResponsesFromStorage()

    if (currentUser.value?.id) {
      // Get submitted responses
      const submitted = surveyStore.getEmployeeSubmittedResponses(currentUser.value.id)
      submittedSurveys.value = submitted.map(response => {
        const survey = surveyStore.getSurveyById(response.survey_id)
        return {
          ...response,
          survey,
          submittedDate: new Date(response.submitted_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      }).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

      // Get draft responses
      const drafts = surveyStore.getEmployeeDraftResponses(currentUser.value.id)
      draftSurveys.value = drafts.map(response => {
        const survey = surveyStore.getSurveyById(response.survey_id)
        return {
          ...response,
          survey,
          savedDate: new Date(response.submitted_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      }).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    }
  } catch (error) {
    console.error('Error loading surveys:', error)
  } finally {
    loading.value = false
  }
})

// 📖 View survey response
const viewSurvey = (surveyId: string) => {
  router.push(`/surveys/${surveyId}/my-response`)
}

// 📝 Continue draft
const continueDraft = (surveyId: string) => {
  router.push(`/surveys/${surveyId}/response`)
}

// 🔙 Go back
const goBack = () => {
  router.push('/employee')
}

// 📊 Stats computed
const stats = computed(() => ({
  submitted: submittedSurveys.value.length,
  drafts: draftSurveys.value.length,
  total: submittedSurveys.value.length + draftSurveys.value.length
}))

// 📤 Submit draft to GRH
const submitDraftToGRH = (surveyId: string) => {
  if (currentUser.value?.id) {
    const success = surveyStore.submitDraftResponse(surveyId, currentUser.value.id)
    if (success) {
      successMessage.value = '✓ Sondage soumis au GRH avec succès'
      showSuccessMessage.value = true
      setTimeout(() => { showSuccessMessage.value = false }, 3000)

      // Reload data
      const response = surveyStore.getResponseByEmployeeAndSurvey(surveyId, currentUser.value.id)
      if (response?.status === 'submitted') {
        draftSurveys.value = draftSurveys.value.filter(s => s.survey_id !== surveyId)
        const survey = surveyStore.getSurveyById(surveyId)
        submittedSurveys.value.unshift({
          ...response,
          survey,
          submittedDate: new Date(response.submitted_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      }
    }
  }
}

// 🔍 Filtered surveys
const filteredSurveys = computed(() => {
  const allSurveys = [
    ...submittedSurveys.value.map(s => ({ ...s, status: 'submitted' as const })),
    ...draftSurveys.value.map(s => ({ ...s, status: 'draft' as const }))
  ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

  if (filterType.value === 'submitted') {
    return allSurveys.filter(s => s.status === 'submitted')
  }
  if (filterType.value === 'draft') {
    return allSurveys.filter(s => s.status === 'draft')
  }
  return allSurveys
})
</script>

<template>
  <div class="space-y-6 animate-fade-in max-w-5xl mx-auto">
    <!-- HEADER -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-foreground">📋 Mes Sondages</h1>
        <p class="text-muted-foreground mt-2">
          Gérez vos sondages soumis et vos brouillons
        </p>
      </div>
      <button
        @click="goBack"
        class="px-4 py-2 border rounded-lg hover:bg-accent transition font-medium text-sm"
      >
        ← Retour au dashboard
      </button>
    </div>

    <!-- STATS CARDS -->
    <div class="grid gap-3 md:grid-cols-3">
      <div class="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-transparent">
        <p class="text-xs text-green-600 font-semibold uppercase tracking-wide">Sondages envoyés</p>
        <p class="text-3xl font-bold text-green-900 mt-3">{{ stats.submitted }}</p>
        <p class="text-xs text-green-600 mt-2">{{ stats.submitted > 1 ? 'entrées' : 'entrée' }}</p>
      </div>
      <div class="border rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-transparent">
        <p class="text-xs text-yellow-600 font-semibold uppercase tracking-wide">Brouillons</p>
        <p class="text-3xl font-bold text-yellow-900 mt-3">{{ stats.drafts }}</p>
        <p class="text-xs text-yellow-600 mt-2">{{ stats.drafts > 1 ? 'brouillons' : 'brouillon' }}</p>
      </div>
      <div class="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-transparent">
        <p class="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total</p>
        <p class="text-3xl font-bold text-blue-900 mt-3">{{ stats.total }}</p>
        <p class="text-xs text-blue-600 mt-2">{{ stats.total > 1 ? 'sondages' : 'sondage' }}</p>
      </div>
    </div>

    <!-- SUCCESS MESSAGE -->
    <transition name="fade">
      <div v-if="showSuccessMessage" class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
        ✓ {{ successMessage }}
      </div>
    </transition>

    <!-- LOADING STATE -->
    <div v-if="loading" class="text-center py-16">
      <div class="inline-flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-muted-foreground">Chargement de vos sondages...</p>
      </div>
    </div>

    <!-- FILTER BUTTONS -->
    <div v-else class="flex gap-2 flex-wrap">
      <button
        @click="filterType = 'all'"
        :class="{
          'px-4 py-2 rounded-lg font-medium transition text-sm': true,
          'bg-primary text-primary-foreground': filterType === 'all',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80': filterType !== 'all'
        }"
      >
        Tous les sondages ({{ stats.total }})
      </button>
      <button
        @click="filterType = 'submitted'"
        :class="{
          'px-4 py-2 rounded-lg font-medium transition text-sm': true,
          'bg-green-600 text-white': filterType === 'submitted',
          'bg-green-100 text-green-700 hover:bg-green-200': filterType !== 'submitted'
        }"
      >
        Envoyés ({{ stats.submitted }})
      </button>
      <button
        @click="filterType = 'draft'"
        :class="{
          'px-4 py-2 rounded-lg font-medium transition text-sm': true,
          'bg-yellow-600 text-white': filterType === 'draft',
          'bg-yellow-100 text-yellow-700 hover:bg-yellow-200': filterType !== 'draft'
        }"
      >
        Brouillons ({{ stats.drafts }})
      </button>
    </div>

    <!-- SURVEYS LIST -->
    <div v-if="!loading" class="space-y-4">
      <!-- EMPTY STATE -->
      <div v-if="filteredSurveys.length === 0" class="text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
        <p class="text-muted-foreground text-lg font-medium mb-2">
          {{ filterType === 'submitted' ? 'Aucun sondage envoyé' : filterType === 'draft' ? 'Aucun brouillon' : 'Aucun sondage' }}
        </p>
        <p class="text-muted-foreground text-sm mb-6">
          {{ filterType === 'draft' ? 'Commencez par répondre à un sondage disponible' : 'Vos sondages apparaîtront ici' }}
        </p>
        <button
          @click="goBack"
          class="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium inline-block"
        >
          Voir les sondages disponibles
        </button>
      </div>

      <!-- SURVEYS CARDS -->
      <div v-else class="space-y-3">
        <div
          v-for="survey in filteredSurveys"
          :key="survey.id"
          :class="{
            'border rounded-lg p-5 transition-all hover:shadow-lg': true,
            'bg-green-50 border-l-4 border-green-500': survey.status === 'submitted',
            'bg-yellow-50 border-l-4 border-yellow-500': survey.status === 'draft'
          }"
        >
          <div class="flex items-start justify-between gap-4">
            <!-- SURVEY INFO -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-3 flex-wrap">
                <h3 class="font-semibold text-foreground text-lg">{{ survey.survey?.title }}</h3>
                <span
                  v-if="survey.status === 'submitted'"
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
                  v-if="survey.survey?.isAnonymous"
                  class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                  title="Ce sondage est anonyme"
                >
                  👤 Anonyme
                </span>
              </div>

              <p class="text-sm text-muted-foreground mb-3">{{ survey.survey?.description }}</p>

              <!-- METADATA -->
              <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span class="flex items-center gap-1">
                  📅
                  {{ survey.status === 'submitted' ? 'Soumis le' : 'Sauvegardé le' }}
                  <strong>{{ survey.status === 'submitted' ? survey.submittedDate : survey.savedDate }}</strong>
                </span>
              </div>
            </div>

            <!-- ACTIONS -->
            <div class="flex gap-2 flex-shrink-0 flex-wrap justify-end">
              <!-- SUBMITTED SURVEY ACTIONS -->
              <button
                v-if="survey.status === 'submitted'"
                @click="viewSurvey(survey.survey_id)"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm whitespace-nowrap"
                title="Voir vos réponses"
              >
                Voir réponses
              </button>

              <!-- DRAFT SURVEY ACTIONS -->
              <template v-else>
                <button
                  @click="continueDraft(survey.survey_id)"
                  class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium text-sm whitespace-nowrap"
                  title="Continuer à répondre au sondage"
                >
                  Continuer
                </button>
                <button
                  @click="submitDraftToGRH(survey.survey_id)"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm whitespace-nowrap"
                  title="Envoyer votre réponse au GRH"
                >
                  Envoyer
                </button>
              </template>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
