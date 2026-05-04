<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2, GripVertical, ChevronLeft, Save, Send } from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useToast } from '~/composables/useToast'

const surveyStore = useSurveyStore()
const toast = useToast()
const loading = ref(false)

// --- Données du formulaire ---
const title = ref('')
const description = ref('')
const isAnonymous = ref(false)

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'open_text' | 'likert' | 'checkbox' | 'rating'
  options: string[]
  is_required: boolean
}

const questions = ref<Question[]>([
  {
    id: crypto.randomUUID(),
    question_text: '',
    question_type: 'multiple_choice',
    options: ['Option 1', 'Option 2'],
    is_required: true
  }
])

const questionTypeLabels: Record<string, string> = {
  multiple_choice: 'Choix multiples',
  open_text: 'Texte libre',
  likert: 'Échelle de Likert (1-5)',
  checkbox: 'Cases à cocher',
  rating: 'Notation par étoiles'
}

const needsOptions = (type: string) => type === 'multiple_choice' || type === 'checkbox'

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
const handleSave = async (status: 'draft' | 'active') => {
  if (!validate()) return

  loading.value = true
  await new Promise(r => setTimeout(r, 400))

  surveyStore.loadFromStorage()
  surveyStore.createSurvey({
    title: title.value.trim(),
    description: description.value.trim(),
    isAnonymous: isAnonymous.value,
    status,
    questions: questions.value.map(q => ({ ...q }))
  })

  toast.success(
    status === 'active' ? 'Sondage publié' : 'Brouillon enregistré',
    status === 'active' ? 'Le sondage est maintenant actif' : 'Vous pouvez le modifier plus tard'
  )

  loading.value = false
  await navigateTo('/grh/surveys')
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
        <h1 class="text-2xl font-bold text-gray-900">Créer un sondage</h1>
        <p class="text-sm text-gray-500">Composez votre sondage et définissez les questions</p>
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
          class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          v-model="description"
          placeholder="Décrivez l'objectif de ce sondage..."
          rows="3"
          class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
        />
      </div>

      <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50">
        <input
          type="checkbox"
          v-model="isAnonymous"
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <p class="text-sm font-medium text-gray-800">Réponses anonymes</p>
          <p class="text-xs text-gray-500">Les identités des répondants ne seront pas enregistrées</p>
        </div>
      </label>
    </div>

    <!-- QUESTIONS -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800">
          Questions
          <span class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
            {{ questions.length }}
          </span>
        </h2>
      </div>

      <div
        v-for="(question, index) in questions"
        :key="question.id"
        class="rounded-xl border bg-white shadow-sm overflow-hidden"
      >
        <!-- En-tête question -->
        <div class="flex items-center gap-3 border-b bg-gray-50 px-4 py-3">
          <GripVertical class="h-4 w-4 text-gray-300" />
          <span class="text-sm font-semibold text-gray-600">Question {{ index + 1 }}</span>
          <div class="ml-auto flex items-center gap-2">
            <label class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                v-model="question.is_required"
                class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              />
              Obligatoire
            </label>
            <button
              @click="removeQuestion(question.id)"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-100 hover:text-red-500"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Corps question -->
        <div class="p-4 space-y-3">
          <input
            v-model="question.question_text"
            type="text"
            :placeholder="`Saisissez votre question ${index + 1}...`"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />

          <select
            v-model="question.question_type"
            @change="onTypeChange(question)"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
          >
            <option v-for="(label, key) in questionTypeLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select>

          <!-- Prévisualisation du type -->
          <div v-if="question.question_type === 'likert'" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
            <div class="flex gap-2">
              <label v-for="n in 5" :key="n" class="flex flex-col items-center gap-1">
                <input type="radio" disabled class="h-4 w-4" />
                <span class="text-xs text-gray-500">{{ n }}</span>
              </label>
            </div>
            <div class="mt-1 flex justify-between text-xs text-gray-400">
              <span>Pas du tout</span>
              <span>Tout à fait</span>
            </div>
          </div>

          <div v-if="question.question_type === 'rating'" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
            <div class="flex gap-1 text-2xl text-amber-400">
              <span v-for="n in 5" :key="n">★</span>
            </div>
          </div>

          <div v-if="question.question_type === 'open_text'" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
            <div class="h-16 rounded border border-dashed border-gray-300 bg-white" />
          </div>

          <!-- OPTIONS (choix multiples / cases à cocher) -->
          <div v-if="needsOptions(question.question_type)" class="space-y-2">
            <p class="text-xs font-medium text-gray-600">Options de réponse :</p>
            <div
              v-for="(opt, i) in question.options"
              :key="i"
              class="flex items-center gap-2"
            >
              <component
                :is="question.question_type === 'checkbox' ? 'div' : 'div'"
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300"
              />
              <input
                v-model="question.options[i]"
                type="text"
                :placeholder="`Option ${i + 1}`"
                class="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
              class="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus class="h-3.5 w-3.5" />
              Ajouter une option
            </button>
          </div>
        </div>
      </div>

      <!-- Bouton ajouter question -->
      <button
        @click="addQuestion"
        class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
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
        @click="handleSave('draft')"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <Save class="h-4 w-4" />
        Enregistrer brouillon
      </button>
      <button
        @click="handleSave('active')"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <Send v-else class="h-4 w-4" />
        {{ loading ? 'Enregistrement...' : 'Publier le sondage' }}
      </button>
    </div>

  </div>
</template>
