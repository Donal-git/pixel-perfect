<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Plus, Trash2, GripVertical, ChevronLeft,
  Save, Send, CalendarX2, Users, CheckSquare
} from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useToast } from '~/composables/useToast'

const surveyStore = useSurveyStore()
const toast       = useToast()
const loading     = ref(false)

// ── Informations générales ───────────────────────────────────────────────────
const title       = ref('')
const description = ref('')
const isAnonymous = ref(false)
const closesAt    = ref('')

// ── Départements ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'RH', 'Finance', 'IT', 'Commercial',
  'Production', 'Marketing', 'Direction', 'Logistique'
]
const selectedDepartments = ref<string[]>([])

const allSelected = computed(() => selectedDepartments.value.length === DEPARTMENTS.length)

const toggleDepartment = (dept: string) => {
  const idx = selectedDepartments.value.indexOf(dept)
  if (idx === -1) selectedDepartments.value.push(dept)
  else            selectedDepartments.value.splice(idx, 1)
}

const toggleAll = () => {
  selectedDepartments.value = allSelected.value ? [] : [...DEPARTMENTS]
}

// ── Questions ────────────────────────────────────────────────────────────────
interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'open_text' | 'likert' | 'checkbox' | 'rating'
  options: string[]
  is_required: boolean
}

const questions = ref<Question[]>([{
  id: crypto.randomUUID(),
  question_text: '',
  question_type: 'multiple_choice',
  options: ['Option 1', 'Option 2'],
  is_required: true
}])

const questionTypeLabels: Record<string, string> = {
  multiple_choice: 'Choix multiple',
  open_text:       'Texte libre',
  likert:          'Échelle de Likert (1–5)',
  checkbox:        'Cases à cocher',
  rating:          'Notation par étoiles'
}

const needsOptions = (type: string) => type === 'multiple_choice' || type === 'checkbox'

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
  if (!needsOptions(question.question_type)) question.options = []
  else if (question.options.length === 0)    question.options = ['Option 1', 'Option 2']
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

// ── Validation ───────────────────────────────────────────────────────────────
const validate = (status: 'draft' | 'active') => {
  if (!title.value.trim()) {
    toast.error('Le titre du sondage est obligatoire')
    return false
  }
  if (status === 'active' && selectedDepartments.value.length === 0) {
    toast.error('Sélectionnez au moins un département destinataire avant de publier')
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

// ── Sauvegarde ───────────────────────────────────────────────────────────────
const handleSave = async (status: 'draft' | 'active') => {
  if (!validate(status)) return

  loading.value = true
  try {
    const newSurvey = await surveyStore.createSurvey({
      title:       title.value.trim(),
      description: description.value.trim(),
      isAnonymous: isAnonymous.value,
      status,
      questions:   questions.value.map(q => ({ ...q })),
      ...(closesAt.value ? { closes_at: closesAt.value } : {})
    })

    // Assigner les départements sélectionnés via l'endpoint dédié
    if (selectedDepartments.value.length > 0 && newSurvey?.id) {
      await surveyStore.sendSurvey(newSurvey.id, [...selectedDepartments.value])
    }

    if (status === 'active') {
      toast.success(
        'Sondage publié',
        `Envoyé aux départements : ${selectedDepartments.value.join(', ')}`
      )
    } else {
      toast.success('Brouillon enregistré', 'Vous pouvez le compléter et le publier plus tard')
    }

    await navigateTo('/grh/surveys')
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de sauvegarder le sondage')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 pb-10">

    <!-- ─── HEADER ──────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/grh/surveys"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
      >
        <ChevronLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Créer un sondage</h1>
        <p class="text-sm text-gray-500">Remplissez les informations, choisissez les destinataires puis composez vos questions</p>
      </div>
    </div>

    <!-- ─── ÉTAPE 1 — INFORMATIONS GÉNÉRALES ────────────────────────────── -->
    <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
      <div class="flex items-center gap-2 border-b pb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">1</span>
        <h2 class="text-base font-semibold text-gray-800">Informations générales</h2>
      </div>

      <!-- Titre -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-gray-700">
          Titre du sondage <span class="text-red-500">*</span>
        </label>
        <input
          v-model="title"
          type="text"
          placeholder="Ex : Satisfaction des employés — T2 2025"
          class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-gray-700">
          Description
          <span class="ml-1 font-normal text-gray-400">(optionnel)</span>
        </label>
        <textarea
          v-model="description"
          placeholder="Décrivez brièvement l'objectif de ce sondage..."
          rows="3"
          class="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <!-- Anonymat + Date de clôture sur la même ligne -->
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50">
          <input
            type="checkbox"
            v-model="isAnonymous"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <p class="text-sm font-medium text-gray-800">Réponses anonymes</p>
            <p class="mt-0.5 text-xs text-gray-500">Les identités des répondants ne seront pas enregistrées</p>
          </div>
        </label>

        <div>
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <CalendarX2 class="h-4 w-4 text-gray-400" />
            Date de clôture automatique
          </label>
          <input
            v-model="closesAt"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <p class="mt-1 text-xs text-gray-400">Le sondage se fermera automatiquement à cette date.</p>
        </div>
      </div>
    </div>

    <!-- ─── ÉTAPE 2 — DÉPARTEMENTS DESTINATAIRES ────────────────────────── -->
    <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
      <div class="flex items-center gap-2 border-b pb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">2</span>
        <h2 class="text-base font-semibold text-gray-800">Départements destinataires</h2>
        <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
          Requis pour publier
        </span>
      </div>

      <p class="text-sm text-gray-500">
        Sélectionnez les départements qui recevront ce sondage. Seuls les employés de ces départements pourront y accéder et y répondre.
      </p>

      <!-- Sélectionner tous -->
      <button
        type="button"
        @click="toggleAll"
        class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition"
        :class="allSelected
          ? 'border-teal-400 bg-teal-50'
          : 'border-dashed border-gray-300 hover:border-teal-300 hover:bg-gray-50'"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
          :class="allSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400'"
        >
          <CheckSquare class="h-4 w-4" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold" :class="allSelected ? 'text-teal-700' : 'text-gray-700'">
            Tous les départements
          </p>
          <p class="text-xs" :class="allSelected ? 'text-teal-500' : 'text-gray-400'">
            Envoyer à l'ensemble des {{ DEPARTMENTS.length }} départements
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
          :class="allSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'"
        >
          {{ DEPARTMENTS.length }}
        </span>
      </button>

      <!-- Grille des départements -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          v-for="dept in DEPARTMENTS"
          :key="dept"
          type="button"
          @click="toggleDepartment(dept)"
          class="group relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all"
          :class="selectedDepartments.includes(dept)
            ? 'border-teal-400 bg-teal-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-teal-50/30'"
        >
          <!-- Indicateur de sélection -->
          <span
            class="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold transition"
            :class="selectedDepartments.includes(dept)
              ? 'bg-teal-500 text-white'
              : 'border border-gray-300 bg-white text-transparent'"
          >✓</span>

          <!-- Avatar département -->
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white transition"
            :class="selectedDepartments.includes(dept) ? 'bg-teal-500' : 'bg-gray-300'"
          >
            {{ dept[0] }}
          </div>

          <span
            class="text-xs font-medium leading-tight"
            :class="selectedDepartments.includes(dept) ? 'text-teal-700' : 'text-gray-600'"
          >
            {{ dept }}
          </span>
        </button>
      </div>

      <!-- Compteur / message d'état -->
      <div
        class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
        :class="selectedDepartments.length > 0
          ? 'bg-teal-50 text-teal-700'
          : 'bg-amber-50 text-amber-700'"
      >
        <Users class="h-4 w-4 shrink-0" />
        <span v-if="selectedDepartments.length > 0">
          <strong>{{ selectedDepartments.length }} département{{ selectedDepartments.length > 1 ? 's' : '' }}</strong>
          sélectionné{{ selectedDepartments.length > 1 ? 's' : '' }} :
          {{ selectedDepartments.join(', ') }}
        </span>
        <span v-else>
          Aucun département sélectionné — sélectionnez au moins un département pour pouvoir publier le sondage.
        </span>
      </div>
    </div>

    <!-- ─── ÉTAPE 3 — QUESTIONS ──────────────────────────────────────────── -->
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">3</span>
          <h2 class="text-base font-semibold text-gray-800">Questions</h2>
        </div>
        <span class="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-600">
          {{ questions.length }} question{{ questions.length > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Carte question -->
      <div
        v-for="(question, index) in questions"
        :key="question.id"
        class="overflow-hidden rounded-xl border bg-white shadow-sm"
      >
        <!-- En-tête -->
        <div class="flex items-center gap-3 border-b bg-gray-50 px-4 py-3">
          <GripVertical class="h-4 w-4 text-gray-300" />
          <span class="text-sm font-semibold text-gray-600">Question {{ index + 1 }}</span>
          <div class="ml-auto flex items-center gap-3">
            <label class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                v-model="question.is_required"
                class="h-3.5 w-3.5 rounded border-gray-300 text-teal-600"
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

        <!-- Corps -->
        <div class="space-y-3 p-4">
          <input
            v-model="question.question_text"
            type="text"
            :placeholder="`Saisissez la question ${index + 1}...`"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />

          <select
            v-model="question.question_type"
            @change="onTypeChange(question)"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option v-for="(label, key) in questionTypeLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select>

          <!-- Aperçu Likert -->
          <div v-if="question.question_type === 'likert'" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
            <div class="flex gap-4">
              <label v-for="n in 5" :key="n" class="flex flex-col items-center gap-1">
                <input type="radio" disabled class="h-4 w-4" />
                <span class="text-xs text-gray-500">{{ n }}</span>
              </label>
            </div>
            <div class="mt-1 flex justify-between text-xs text-gray-400">
              <span>Pas du tout</span><span>Tout à fait</span>
            </div>
          </div>

          <!-- Aperçu étoiles -->
          <div v-if="question.question_type === 'rating'" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
            <div class="flex gap-1 text-2xl text-amber-400">
              <span v-for="n in 5" :key="n">★</span>
            </div>
          </div>

          <!-- Aperçu texte libre -->
          <div v-if="question.question_type === 'open_text'" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-xs text-gray-500">Aperçu :</p>
            <div class="h-16 rounded border border-dashed border-gray-300 bg-white" />
          </div>

          <!-- Options (choix multiple / cases à cocher) -->
          <div v-if="needsOptions(question.question_type)" class="space-y-2">
            <p class="text-xs font-medium text-gray-600">Options de réponse :</p>
            <div v-for="(_, i) in question.options" :key="i" class="flex items-center gap-2">
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
              class="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              <Plus class="h-3.5 w-3.5" /> Ajouter une option
            </button>
          </div>
        </div>
      </div>

      <!-- Ajouter une question -->
      <button
        @click="addQuestion"
        class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600"
      >
        <Plus class="h-4 w-4" />
        Ajouter une question
      </button>
    </div>

    <!-- ─── ACTIONS ───────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
      <NuxtLink
        to="/grh/surveys"
        class="text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        ← Annuler
      </NuxtLink>

      <div class="flex gap-3">
        <!-- Brouillon -->
        <button
          @click="handleSave('draft')"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <Save class="h-4 w-4" />
          Enregistrer en brouillon
        </button>

        <!-- Publier -->
        <button
          @click="handleSave('active')"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          :title="selectedDepartments.length === 0 ? 'Sélectionnez au moins un département' : ''"
        >
          <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <Send v-else class="h-4 w-4" />
          {{ loading ? 'Publication en cours...' : 'Publier le sondage' }}
        </button>
      </div>
    </div>

  </div>
</template>
