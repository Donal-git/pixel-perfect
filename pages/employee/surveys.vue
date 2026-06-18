<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSurveyStore } from '~/stores/survey'
import { useRouter } from 'vue-router'
import { ChevronLeft, CheckCircle2, Clock, User, Calendar } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const surveyStore = useSurveyStore()

const currentUser = computed(() => authStore.user)

const loading = ref(true)
const filterType = ref<'all' | 'submitted' | 'draft'>('all')
const showSuccessMessage = ref(false)
const successMessage = ref('')

const submittedSurveys = ref<any[]>([])
const draftSurveys = ref<any[]>([])

onMounted(async () => {
  loading.value = true
  try {
    await surveyStore.loadFromStorage()
    await surveyStore.loadResponsesFromStorage()

    if (currentUser.value?.id) {
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

const viewSurvey = (surveyId: string) => {
  router.push(`/surveys/${surveyId}/my-response`)
}

const continueDraft = (surveyId: string) => {
  router.push(`/surveys/${surveyId}/response`)
}

const goBack = () => {
  router.push('/employee')
}

const stats = computed(() => ({
  submitted: submittedSurveys.value.length,
  drafts: draftSurveys.value.length,
  total: submittedSurveys.value.length + draftSurveys.value.length
}))

const submitDraftToGRH = async (surveyId: string) => {
  if (!currentUser.value?.id) return
  await surveyStore.submitDraftResponse(surveyId, currentUser.value.id)
  const response = surveyStore.getResponseByEmployeeAndSurvey(surveyId, currentUser.value.id)
  if (response?.status === 'submitted') {
    successMessage.value = 'Sondage soumis au GRH avec succès'
    showSuccessMessage.value = true
    setTimeout(() => { showSuccessMessage.value = false }, 3000)
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
  <div class="mx-auto max-w-4xl space-y-6">

    <!-- HEADER -->
    <div class="flex items-center gap-4">
      <button
        @click="goBack"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
      >
        <ChevronLeft class="h-5 w-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-slate-900">Mes Sondages</h1>
        <p class="mt-0.5 text-sm text-slate-500">Sondages soumis et brouillons en cours</p>
      </div>
    </div>

    <!-- STATS CARDS -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500">Envoyés</p>
            <p class="text-3xl font-bold text-emerald-600 mt-1">{{ stats.submitted }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <CheckCircle2 class="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500">Brouillons</p>
            <p class="text-3xl font-bold text-amber-600 mt-1">{{ stats.drafts }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Clock class="h-5 w-5 text-amber-600" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500">Total</p>
            <p class="text-3xl font-bold text-slate-700 mt-1">{{ stats.total }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <User class="h-5 w-5 text-slate-500" />
          </div>
        </div>
      </div>
    </div>

    <!-- SUCCESS MESSAGE -->
    <transition name="fade">
      <div
        v-if="showSuccessMessage"
        class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
      >
        <CheckCircle2 class="h-4 w-4 text-emerald-600" />
        <p class="text-sm font-medium text-emerald-800">{{ successMessage }}</p>
      </div>
    </transition>

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>

    <template v-else>
      <!-- FILTER BUTTONS -->
      <div class="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit shadow-sm">
        <button
          @click="filterType = 'all'"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition"
          :class="filterType === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'"
        >
          Tous ({{ stats.total }})
        </button>
        <button
          @click="filterType = 'submitted'"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition"
          :class="filterType === 'submitted' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'"
        >
          Envoyés ({{ stats.submitted }})
        </button>
        <button
          @click="filterType = 'draft'"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition"
          :class="filterType === 'draft' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'"
        >
          Brouillons ({{ stats.drafts }})
        </button>
      </div>

      <!-- SURVEYS LIST -->
      <div class="space-y-3">

        <!-- EMPTY STATE -->
        <div
          v-if="filteredSurveys.length === 0"
          class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center"
        >
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <CheckCircle2 class="h-7 w-7 text-slate-300" />
          </div>
          <p class="mt-4 text-sm font-medium text-slate-700">
            {{ filterType === 'submitted' ? 'Aucun sondage envoyé' : filterType === 'draft' ? 'Aucun brouillon' : 'Aucun sondage' }}
          </p>
          <p class="mt-1 text-xs text-slate-400">
            {{ filterType === 'draft' ? 'Commencez par répondre à un sondage disponible' : 'Vos sondages apparaîtront ici' }}
          </p>
          <button
            @click="goBack"
            class="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            Voir les sondages disponibles
          </button>
        </div>

        <!-- SURVEY CARDS -->
        <div
          v-for="survey in filteredSurveys"
          :key="survey.id"
          class="rounded-xl border bg-white shadow-sm overflow-hidden"
          :class="survey.status === 'submitted' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-amber-400'"
        >
          <div class="p-5">
            <div class="flex items-start justify-between gap-4">

              <!-- INFO -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <h3 class="font-semibold text-slate-900 text-base truncate">{{ survey.survey?.title }}</h3>

                  <!-- Statut badge -->
                  <span
                    v-if="survey.status === 'submitted'"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                  >
                    <CheckCircle2 class="h-3 w-3" /> Envoyé
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
                  >
                    <Clock class="h-3 w-3" /> Brouillon
                  </span>

                  <!-- Anonyme -->
                  <span
                    v-if="survey.survey?.isAnonymous"
                    class="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700"
                  >
                    Anonyme
                  </span>
                </div>

                <p v-if="survey.survey?.description" class="text-sm text-slate-500 mb-3 line-clamp-1">
                  {{ survey.survey.description }}
                </p>

                <!-- Date -->
                <div class="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar class="h-3.5 w-3.5" />
                  <span>{{ survey.status === 'submitted' ? 'Soumis le' : 'Sauvegardé le' }}</span>
                  <span class="font-medium text-slate-600">
                    {{ survey.status === 'submitted' ? survey.submittedDate : survey.savedDate }}
                  </span>
                </div>
              </div>

              <!-- ACTIONS -->
              <div class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  v-if="survey.status === 'submitted'"
                  @click="viewSurvey(survey.survey_id)"
                  class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Voir mes réponses
                </button>

                <template v-else>
                  <button
                    @click="continueDraft(survey.survey_id)"
                    class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    Continuer
                  </button>
                  <button
                    @click="submitDraftToGRH(survey.survey_id)"
                    class="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-700"
                  >
                    Soumettre
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
