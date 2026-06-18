<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Trash2, GripVertical, ChevronLeft, Save, AlertCircle, Lock, CalendarX2 } from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useToast } from '~/composables/useToast'

const route = useRoute()
const surveyStore = useSurveyStore()
const toast = useToast()

const surveyId = route.params.id as string
const loading = ref(false)
const notFound = ref(false)

// --- Données formulaire ---
const title = ref('')
const description = ref('')
const isAnonymous = ref(false)
const closesAt = ref('')
const currentStatus = ref<'draft' | 'active' | 'closed'>('draft')

// Les questions sont verrouillées dès que le sondage est actif
const questionsLocked = computed(() => currentStatus.value === 'active')

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'open_text' | 'likert' | 'checkbox' | 'rating'
  options: string[]
  is_required: boolean
}

const questions = ref<Question[]>([])

const questionTypeLabels: Record<string, string> = {
  multiple_choice: 'Choix multiples',
  open_text: 'Texte libre',
  likert: 'Échelle de Likert (1-5)',
  checkbox: 'Cases à cocher',
  rating: 'Notation par étoiles'
}

const needsOptions = (type: string) => type === 'multiple_choice' || type === 'checkbox'

// --- Chargement du sondage existant ---
onMounted(async () => {
  await surveyStore.loadFromStorage()
  const survey = surveyStore.getSurveyById(surveyId)
  if (!survey) {
    notFound.value = true
    return
  }
  title.value = survey.title
  description.value = survey.description
  isAnonymous.value = survey.isAnonymous
  closesAt.value = survey.closes_at || ''
  currentStatus.value = survey.status
  questions.value = survey.questions.map(q => ({ ...q, options: [...q.options] }))

  if (questions.value.length === 0) {
    addQuestion()
  }
})

// --- Gestion des questions ---
const addQuestion = () => {
  questions.value.push({
    id: crypto.randomUUID(),
    question_text: '',
    question_type: 'multiple_choice',
    options: ['Option 1', 'Option 2'],
    is_required: true
  })
}

const removeQuestion = (id: string) => {
  if (questions.value.length <= 1) {
    toast.error('Le sondage doit contenir au moins une question')
    return
  }
  questions.value = questions.value.filter(q => q.id !== id)
}

const onTypeChange = (question: Question) => {
  if (!needsOptions(question.question_type)) {
    question.options = []
  } else if (question.options.length === 0) {
    question.options = ['Option 1', 'Option 2']
  }
}

const addOption = (question: Question) => {
  question.options.push(`Option ${question.options.length + 1}`)
}

const removeOption = (question: Question, index: number) => {
  if (question.options.length <= 2) {
    toast.error('Il faut au minimum 2 options')
    return
  }
  question.options.splice(index, 1)
}

// --- Validation ---
const validate = () => {
  if (!title.value.trim()) {
    toast.error('Le titre du sondage est obligatoire')
    return false
  }
  for (const q of questions.value) {
    if (!q.question_text.trim()) {
      toast.error('Toutes les questions doivent être remplies')
      return false
    }
    if (needsOptions(q.question_type) && q.options.some(o => !o.trim())) {
      toast.error('Toutes les options doivent être remplies')
      return false
    }
  }
  return true
}

// --- Sauvegarde ---
const handleSave = async (status?: 'draft' | 'active') => {
  if (!validate()) return

  loading.value = true
  try {
    await surveyStore.updateSurvey(surveyId, {
      title: title.value.trim(),
      description: description.value.trim(),
      isAnonymous: isAnonymous.value,
      closes_at: closesAt.value || undefined,
      // Ne jamais envoyer les questions si le sondage est actif (protection serveur)
      ...(!questionsLocked.value ? { questions: questions.value.map(q => ({ ...q })) } : {}),
      ...(status ? { status } : {})
    })
    toast.success('Sondage mis à jour', 'Les modifications ont été enregistrées')
    await navigateTo('/grh/surveys')
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de modifier ce sondage')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">

    <!-- HEADER -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/grh/surveys"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
      >
        <ChevronLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Modifier le sondage</h1>
        <p class="text-sm text-gray-500">Mettez à jour les questions et les paramètres</p>
      </div>
    </div>

    <!-- SONDAGE NON TROUVÉ -->
    <div v-if="notFound" class="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center shadow-sm">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
        <AlertCircle class="h-8 w-8 text-red-500" />
      </div>
      <p class="mt-4 text-lg font-semibold text-gray-900">Sondage introuvable</p>
      <p class="mt-1 text-sm text-gray-500">Ce sondage n'existe pas ou a été supprimé.</p>
      <NuxtLink
        to="/grh/surveys"
        class="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Retour aux sondages
      </NuxtLink>
    </div>

    <template v-else>
      <!-- BANNIÈRE VERROUILLAGE -->
      <div
        v-if="questionsLocked"
        class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
      >
        <Lock class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p class="text-sm font-semibold text-amber-800">Sondage actif — questions verrouillées</p>
          <p class="mt-0.5 text-xs text-amber-700">
            Ce sondage a déjà été publié. Pour préserver l'intégrité des réponses existantes, les questions ne peuvent plus être modifiées.
            Vous pouvez toujours mettre à jour le titre, la description et la date de clôture.
          </p>
        </div>
      </div>

      <!-- INFORMATIONS GÉNÉRALES -->
      <div class="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 class="text-base font-semibold text-gray-800">Informations générales</h2>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">
            Titre du sondage <span class="text-red-500">*</span>
          </label>
          <input
            v-model="title"
            type="text"
            placeholder="Ex : Satisfaction des employés Q2 2024"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            v-model="description"
            placeholder="Décrivez l'objectif de ce sondage..."
            rows="3"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none"
          />
        </div>

        <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50">
          <input
            type="checkbox"
            v-model="isAnonymous"
            class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <p class="text-sm font-medium text-gray-800">Réponses anonymes</p>
            <p class="text-xs text-gray-500">Les identités des répondants ne seront pas enregistrées</p>
          </div>
        </label>

        <div>
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <CalendarX2 class="h-4 w-4 text-gray-400" />
            Date de clôture automatique
            <span class="ml-1 text-xs font-normal text-gray-400">(optionnel)</span>
          </label>
          <input
            v-model="closesAt"
            type="date"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <p class="mt-1 text-xs text-gray-400">Le sondage sera automatiquement fermé aux employés après cette date.</p>
        </div>
      </div>

      <!-- QUESTIONS -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800 flex items-center gap-2">
            Questions
            <span class="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-600">
              {{ questions.length }}
            </span>
            <span v-if="questionsLocked" class="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Lock class="h-3 w-3" /> Verrouillées
            </span>
          </h2>
        </div>

        <div
          v-for="(question, index) in questions"
          :key="question.id"
          class="rounded-xl border bg-white shadow-sm overflow-hidden"
        >
          <div class="flex items-center gap-3 border-b bg-gray-50 px-4 py-3">
            <GripVertical class="h-4 w-4 text-gray-300" />
            <span class="text-sm font-semibold text-gray-600">Question {{ index + 1 }}</span>
            <div class="ml-auto flex items-center gap-2">
              <label
                class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500"
                :class="questionsLocked ? 'opacity-40 cursor-not-allowed' : ''"
              >
                <input
                  type="checkbox"
                  v-model="question.is_required"
                  :disabled="questionsLocked"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-teal-600"
                />
                Obligatoire
              </label>
              <button
                v-if="!questionsLocked"
                @click="removeQuestion(question.id)"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-100 hover:text-red-500"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div class="p-4 space-y-3">
            <input
              v-model="question.question_text"
              type="text"
              :placeholder="`Saisissez votre question ${index + 1}...`"
              :disabled="questionsLocked"
              :class="questionsLocked ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'focus:border-teal-400 focus:ring-2 focus:ring-teal-100'"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none transition"
            />

            <select
              v-model="question.question_type"
              @change="onTypeChange(question)"
              :disabled="questionsLocked"
              :class="questionsLocked ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'focus:border-teal-400 focus:ring-2 focus:ring-teal-100'"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition bg-white"
            >
              <option v-for="(label, key) in questionTypeLabels" :key="key" :value="key">
                {{ label }}
              </option>
            </select>

            <div v-if="question.question_type === 'likert'" class="rounded-lg bg-gray-50 p-3">
              <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
              <div class="flex gap-2">
                <label v-for="n in 5" :key="n" class="flex flex-col items-center gap-1">
                  <input type="radio" disabled class="h-4 w-4" />
                  <span class="text-xs text-gray-500">{{ n }}</span>
                </label>
              </div>
            </div>

            <div v-if="question.question_type === 'rating'" class="rounded-lg bg-gray-50 p-3">
              <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
              <div class="flex gap-1 text-2xl text-amber-400">
                <span v-for="n in 5" :key="n">★</span>
              </div>
            </div>

            <div v-if="needsOptions(question.question_type)" class="space-y-2">
              <p class="text-xs font-medium text-gray-600">Options de réponse :</p>
              <div
                v-for="(_opt, i) in question.options"
                :key="i"
                class="flex items-center gap-2"
              >
                <div class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300" />
                <input
                  v-model="question.options[i]"
                  type="text"
                  :placeholder="`Option ${i + 1}`"
                  class="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  @click="removeOption(question, i)"
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                @click="addOption(question)"
                class="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700"
              >
                <Plus class="h-3.5 w-3.5" />
                Ajouter une option
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="!questionsLocked"
          @click="addQuestion"
          class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600"
        >
          <Plus class="h-4 w-4" />
          Ajouter une question
        </button>
      </div>

      <!-- ACTIONS -->
      <div class="flex justify-end gap-3 pb-8">
        <NuxtLink
          to="/grh/surveys"
          class="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Annuler
        </NuxtLink>
        <button
          @click="handleSave()"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <Save v-else class="h-4 w-4" />
          {{ loading ? 'Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
      </div>
    </template>

  </div>
</template>
