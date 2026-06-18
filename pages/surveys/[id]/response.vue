<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Send, Save, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useSurveyStore } from '~/stores/survey'
import { useToast } from '~/composables/useToast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const surveyStore = useSurveyStore()
const toast = useToast()

const currentUser = computed(() => authStore.user)
const surveyId = route.params.id as string

const survey = ref<any>(null)
const questions = ref<any[]>([])
const answers = ref<Record<string, string | string[]>>({})
const loading = ref(true)
const submitting = ref(false)
const isResponseSubmitted = ref(false)
const isResponseDraft = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await surveyStore.loadFromStorage()
    await surveyStore.loadResponsesFromStorage()
    const foundSurvey = surveyStore.getSurveyById(surveyId)
    if (foundSurvey) {
      survey.value = foundSurvey
      questions.value = foundSurvey.questions || []
      if (currentUser.value?.id) {
        const existingResponse = surveyStore.getResponseByEmployeeAndSurvey(surveyId, currentUser.value.id)
        if (existingResponse) {
          answers.value = existingResponse.answers
          isResponseSubmitted.value = existingResponse.status === 'submitted'
          isResponseDraft.value = existingResponse.status === 'draft'
        }
      }
    }
  } catch (error) {
    console.error('Error loading survey:', error)
  } finally {
    loading.value = false
  }
})

const validateAnswers = () => {
  const errors: string[] = []
  questions.value.forEach((q: any, index: number) => {
    if (q.is_required) {
      const answer = answers.value[q.id]
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        errors.push(`Question ${index + 1} obligatoire`)
      }
    }
  })
  return errors
}

const handleSubmit = async () => {
  const errors = validateAnswers()
  if (errors.length > 0) {
    toast.error('Questions obligatoires manquantes', errors.join(' · '))
    return
  }
  if (!currentUser.value?.id) { toast.error('Utilisateur non identifié'); return }
  submitting.value = true
  try {
    await surveyStore.submitResponse(surveyId, currentUser.value.id, answers.value)
    toast.success('Réponses envoyées avec succès')
    await router.push('/employee')
  } catch (error) {
    toast.error("Erreur lors de l'envoi des réponses")
  } finally {
    submitting.value = false
  }
}

const handleSaveDraft = async () => {
  if (!currentUser.value?.id) { toast.error('Utilisateur non identifié'); return }
  try {
    await surveyStore.saveResponseDraft(surveyId, currentUser.value.id, answers.value)
    toast.success('Brouillon enregistré')
  } catch (error) {
    toast.error("Erreur lors de l'enregistrement")
  }
}

const updateCheckboxAnswer = (questionId: string, option: string, checked: boolean) => {
  const current = (answers.value[questionId] as string[]) || []
  answers.value[questionId] = checked ? [...current, option] : current.filter(o => o !== option)
}

const isCheckboxChecked = (questionId: string, option: string) => {
  const answer = answers.value[questionId]
  return Array.isArray(answer) ? answer.includes(option) : false
}

const getOptions = (options: any) => Array.isArray(options) ? options : []
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 pb-10">

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>

    <!-- NOT FOUND -->
    <div v-else-if="!survey" class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <AlertTriangle class="mx-auto h-10 w-10 text-slate-300" />
      <p class="mt-4 text-sm font-medium text-slate-700">Sondage introuvable</p>
      <button
        @click="router.push('/employee')"
        class="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <ChevronLeft class="h-4 w-4" /> Retour
      </button>
    </div>

    <!-- CONTENT -->
    <div v-else class="space-y-6">

      <!-- HEADER -->
      <div class="flex items-start gap-4">
        <button
          @click="router.push('/employee')"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <div class="min-w-0">
          <h1 class="text-xl font-bold text-slate-900">{{ survey.title }}</h1>
          <p v-if="survey.description" class="mt-1 text-sm text-slate-500">{{ survey.description }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="{
                'bg-emerald-50 text-emerald-700': survey.status === 'active',
                'bg-amber-50 text-amber-700':     survey.status === 'draft',
                'bg-slate-100 text-slate-500':    survey.status === 'closed'
              }">
              {{ survey.status === 'active' ? 'Actif' : survey.status === 'draft' ? 'Brouillon' : 'Fermé' }}
            </span>
            <span v-if="survey.isAnonymous" class="text-xs text-slate-400">Anonyme</span>
          </div>
        </div>
      </div>

      <!-- SUBMITTED STATE -->
      <div v-if="isResponseSubmitted" class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p class="text-sm font-semibold text-emerald-900">Réponses déjà soumises</p>
          <p class="mt-0.5 text-xs text-emerald-700">
            Vous avez déjà envoyé vos réponses. Consultez-les dans "Mes sondages".
          </p>
        </div>
      </div>

      <!-- DRAFT STATE -->
      <div v-else-if="isResponseDraft" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Save class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p class="text-sm font-semibold text-amber-900">Brouillon en cours</p>
          <p class="mt-0.5 text-xs text-amber-700">Vous pouvez continuer à modifier vos réponses avant de soumettre.</p>
        </div>
      </div>

      <!-- INFO BAR -->
      <div class="flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
        <span class="font-semibold">{{ questions.length }}</span> question{{ questions.length > 1 ? 's' : '' }} à répondre
        <span v-if="questions.some((q: any) => q.is_required)" class="ml-auto text-xs text-teal-600">
          Les champs <span class="text-red-500 font-medium">*</span> sont obligatoires
        </span>
      </div>

      <!-- FORM -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div
          v-for="(q, index) in questions"
          :key="q.id"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p class="mb-4 text-sm font-semibold text-slate-900">
            {{ index + 1 }}. {{ q.question_text }}
            <span v-if="q.is_required" class="ml-0.5 text-red-500">*</span>
          </p>

          <!-- Texte libre -->
          <textarea
            v-if="q.question_type === 'open_text'"
            v-model="answers[q.id]"
            :disabled="isResponseSubmitted"
            rows="4"
            placeholder="Votre réponse..."
            class="w-full resize-none rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <!-- Choix multiple (radio) -->
          <div v-if="q.question_type === 'multiple_choice'" class="space-y-2">
            <label
              v-for="(opt, j) in getOptions(q.options)"
              :key="j"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition"
              :class="!isResponseSubmitted ? 'hover:border-slate-200 hover:bg-slate-50' : 'cursor-not-allowed opacity-60'"
            >
              <input type="radio" :name="q.id" :value="opt" v-model="answers[q.id]" :disabled="isResponseSubmitted"
                class="h-4 w-4 cursor-pointer accent-teal-600 disabled:cursor-not-allowed" />
              <span class="text-slate-700">{{ opt }}</span>
            </label>
          </div>

          <!-- Cases à cocher -->
          <div v-if="q.question_type === 'checkbox'" class="space-y-2">
            <label
              v-for="(opt, j) in getOptions(q.options)"
              :key="j"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition"
              :class="!isResponseSubmitted ? 'hover:border-slate-200 hover:bg-slate-50' : 'cursor-not-allowed opacity-60'"
            >
              <input type="checkbox" :checked="isCheckboxChecked(q.id, opt)"
                @change="(e: any) => !isResponseSubmitted && updateCheckboxAnswer(q.id, opt, e.target.checked)"
                :disabled="isResponseSubmitted"
                class="h-4 w-4 cursor-pointer accent-teal-600 disabled:cursor-not-allowed" />
              <span class="text-slate-700">{{ opt }}</span>
            </label>
          </div>

          <!-- Échelle Likert -->
          <div v-if="q.question_type === 'likert'" class="rounded-lg bg-slate-50 p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-slate-400">Pas du tout</span>
              <div class="flex gap-3">
                <label v-for="n in 5" :key="n" class="flex flex-col items-center gap-1.5 cursor-pointer"
                  :class="isResponseSubmitted ? 'opacity-50 cursor-not-allowed' : ''">
                  <input type="radio" :value="String(n)" v-model="answers[q.id]" :disabled="isResponseSubmitted"
                    class="h-4 w-4 accent-teal-600 cursor-pointer disabled:cursor-not-allowed" />
                  <span class="text-xs font-medium text-slate-500">{{ n }}</span>
                </label>
              </div>
              <span class="text-xs text-slate-400">Tout à fait</span>
            </div>
          </div>

          <!-- Notation étoiles -->
          <div v-if="q.question_type === 'rating'" class="flex gap-1">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              @click="!isResponseSubmitted && (answers[q.id] = String(n))"
              :disabled="isResponseSubmitted"
              class="text-3xl transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span :class="Number(answers[q.id]) >= n ? 'text-amber-400' : 'text-slate-200'">★</span>
            </button>
          </div>
        </div>

        <!-- ACTIONS -->
        <div v-if="!isResponseSubmitted" class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <button type="button" @click="router.push('/employee')"
            class="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← Annuler
          </button>
          <div class="flex gap-3">
            <button type="button" @click="handleSaveDraft"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <Save class="h-4 w-4" /> Brouillon
            </button>
            <button type="submit" :disabled="submitting"
              class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50">
              <svg v-if="submitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <Send v-else class="h-4 w-4" />
              {{ submitting ? 'Envoi...' : 'Soumettre' }}
            </button>
          </div>
        </div>

        <div v-else class="flex gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <button type="button" @click="router.push('/employee/surveys')"
            class="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700">
            Voir mes sondages
          </button>
          <button type="button" @click="router.push('/employee')"
            class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Retour
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
