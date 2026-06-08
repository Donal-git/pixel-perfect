<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus,
  Send,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  ClipboardList,
  Clock,
  Archive,
  Users,
  BarChart3,
  CalendarX2
} from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useToast } from '~/composables/useToast'

const surveyStore = useSurveyStore()
const toast = useToast()

const DEPARTMENTS = [
  'RH',
  'Finance',
  'IT',
  'Commercial',
  'Production',
  'Marketing',
  'Direction',
  'Logistique'
]

// --- Modal envoi ---
const showSendModal = ref(false)
const sendingSurveyId = ref<string | null>(null)
const selectedDepartments = ref<string[]>([])
const sendingLoading = ref(false)

// --- Modal suppression ---
const showDeleteModal = ref(false)
const deletingSurveyId = ref<string | null>(null)

// --- Filtre statut ---
const activeFilter = ref<'all' | 'active' | 'draft' | 'closed'>('all')

onMounted(async () => { await surveyStore.loadFromStorage() })

const filteredSurveys = computed(() => {
  if (activeFilter.value === 'all') return surveyStore.surveys
  return surveyStore.surveys.filter(s => s.status === activeFilter.value)
})

const stats = computed(() => ({
  total: surveyStore.surveys.length,
  active: surveyStore.surveys.filter(s => s.status === 'active').length,
  draft: surveyStore.surveys.filter(s => s.status === 'draft').length,
  closed: surveyStore.surveys.filter(s => s.status === 'closed').length
}))

const surveyToSend = computed(() =>
  sendingSurveyId.value ? surveyStore.getSurveyById(sendingSurveyId.value) : null
)

// --- Actions envoi ---
const openSendModal = (id: string) => {
  sendingSurveyId.value = id
  const survey = surveyStore.getSurveyById(id)
  selectedDepartments.value = survey?.sent_to ? [...survey.sent_to] : []
  showSendModal.value = true
}

const closeSendModal = () => {
  showSendModal.value = false
  sendingSurveyId.value = null
  selectedDepartments.value = []
}

const toggleDepartment = (dept: string) => {
  const idx = selectedDepartments.value.indexOf(dept)
  if (idx === -1) {
    selectedDepartments.value.push(dept)
  } else {
    selectedDepartments.value.splice(idx, 1)
  }
}

const toggleAllDepartments = () => {
  if (selectedDepartments.value.length === DEPARTMENTS.length) {
    selectedDepartments.value = []
  } else {
    selectedDepartments.value = [...DEPARTMENTS]
  }
}

const handleSendSurvey = async () => {
  if (!sendingSurveyId.value) return
  if (selectedDepartments.value.length === 0) {
    toast.error('Sélectionnez au moins un département')
    return
  }
  sendingLoading.value = true
  try {
    await surveyStore.sendSurvey(sendingSurveyId.value, [...selectedDepartments.value])
    toast.success('Sondage envoyé', `Envoyé à : ${selectedDepartments.value.join(', ')}`)
    closeSendModal()
  } catch (err: any) {
    toast.error(err?.data?.message || "Erreur lors de l'envoi")
  } finally {
    sendingLoading.value = false
  }
}

// --- Actions suppression ---
const openDeleteModal = (id: string) => {
  deletingSurveyId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (deletingSurveyId.value) {
    try {
      await surveyStore.deleteSurvey(deletingSurveyId.value)
      toast.success('Sondage supprimé')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de supprimer ce sondage')
    }
  }
  showDeleteModal.value = false
  deletingSurveyId.value = null
}

// --- Helpers UI ---
const statusConfig = {
  active: { label: 'Actif', class: 'bg-green-100 text-green-700 border border-green-200' },
  draft: { label: 'Brouillon', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
  closed: { label: 'Fermé', class: 'bg-gray-100 text-gray-500 border border-gray-200' }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isSurveyExpired = (survey: any) => surveyStore.isSurveyExpired(survey)
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mes Sondages</h1>
        <p class="mt-1 text-sm text-gray-500">Créez, gérez et envoyez vos sondages au personnel</p>
      </div>
      <NuxtLink
        to="/grh/surveys/create"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Plus class="h-4 w-4" />
        Nouveau sondage
      </NuxtLink>
    </div>

    <!-- STATS CARDS -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <button
        @click="activeFilter = 'all'"
        class="rounded-xl border p-4 text-left transition hover:shadow-md"
        :class="activeFilter === 'all' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'bg-white'"
      >
        <p class="text-xs font-medium text-gray-500">Total</p>
        <p class="mt-1 text-3xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="mt-1 text-xs text-gray-400">sondages</p>
      </button>

      <button
        @click="activeFilter = 'active'"
        class="rounded-xl border p-4 text-left transition hover:shadow-md"
        :class="activeFilter === 'active' ? 'border-green-500 bg-green-50 shadow-sm' : 'bg-white'"
      >
        <p class="text-xs font-medium text-gray-500">Actifs</p>
        <p class="mt-1 text-3xl font-bold text-green-600">{{ stats.active }}</p>
        <p class="mt-1 text-xs text-gray-400">en cours</p>
      </button>

      <button
        @click="activeFilter = 'draft'"
        class="rounded-xl border p-4 text-left transition hover:shadow-md"
        :class="activeFilter === 'draft' ? 'border-amber-400 bg-amber-50 shadow-sm' : 'bg-white'"
      >
        <p class="text-xs font-medium text-gray-500">Brouillons</p>
        <p class="mt-1 text-3xl font-bold text-amber-600">{{ stats.draft }}</p>
        <p class="mt-1 text-xs text-gray-400">non publiés</p>
      </button>

      <button
        @click="activeFilter = 'closed'"
        class="rounded-xl border p-4 text-left transition hover:shadow-md"
        :class="activeFilter === 'closed' ? 'border-gray-400 bg-gray-50 shadow-sm' : 'bg-white'"
      >
        <p class="text-xs font-medium text-gray-500">Fermés</p>
        <p class="mt-1 text-3xl font-bold text-gray-500">{{ stats.closed }}</p>
        <p class="mt-1 text-xs text-gray-400">terminés</p>
      </button>
    </div>

    <!-- LISTE DES SONDAGES -->
    <div class="rounded-xl border bg-white shadow-sm">
      <div class="border-b px-6 py-4">
        <h2 class="font-semibold text-gray-800">
          {{ activeFilter === 'all' ? 'Tous les sondages' : `Sondages — ${statusConfig[activeFilter]?.label}` }}
          <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {{ filteredSurveys.length }}
          </span>
        </h2>
      </div>

      <!-- VIDE -->
      <div v-if="filteredSurveys.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <ClipboardList class="h-8 w-8 text-gray-400" />
        </div>
        <p class="mt-4 text-sm font-medium text-gray-900">Aucun sondage trouvé</p>
        <p class="mt-1 text-xs text-gray-500">
          {{ activeFilter === 'all' ? 'Créez votre premier sondage pour commencer.' : 'Aucun sondage dans cette catégorie.' }}
        </p>
        <NuxtLink
          v-if="activeFilter === 'all'"
          to="/grh/surveys/create"
          class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus class="h-4 w-4" /> Créer un sondage
        </NuxtLink>
      </div>

      <!-- LISTE -->
      <div v-else class="divide-y">
        <div
          v-for="survey in filteredSurveys"
          :key="survey.id"
          class="group flex items-center gap-4 px-6 py-4 transition hover:bg-gray-50"
        >
          <!-- Icône statut -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :class="{
              'bg-green-100': survey.status === 'active',
              'bg-amber-100': survey.status === 'draft',
              'bg-gray-100': survey.status === 'closed'
            }"
          >
            <CheckCircle2 v-if="survey.status === 'active'" class="h-5 w-5 text-green-600" />
            <Clock v-else-if="survey.status === 'draft'" class="h-5 w-5 text-amber-600" />
            <Archive v-else class="h-5 w-5 text-gray-500" />
          </div>

          <!-- Infos -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-gray-900">{{ survey.title }}</p>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="isSurveyExpired(survey) && survey.status === 'active'
                  ? 'bg-gray-100 text-gray-500'
                  : statusConfig[survey.status]?.class"
              >
                {{ isSurveyExpired(survey) && survey.status === 'active' ? 'Clôturé' : statusConfig[survey.status]?.label }}
              </span>
            </div>
            <p class="mt-0.5 truncate text-xs text-gray-500">{{ survey.description || 'Aucune description' }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {{ formatDate(survey.created_at) }}
              </span>
              <span class="flex items-center gap-1">
                <ClipboardList class="h-3 w-3" />
                {{ survey.questions.length }} question{{ survey.questions.length > 1 ? 's' : '' }}
              </span>
              <span v-if="survey.sent_to?.length > 0" class="flex items-center gap-1 text-blue-500">
                <Users class="h-3 w-3" />
                {{ survey.sent_to.join(', ') }}
              </span>
              <!-- Date de clôture -->
              <span
                v-if="survey.closes_at"
                class="flex items-center gap-1"
                :class="isSurveyExpired(survey) ? 'text-red-500' : 'text-amber-500'"
              >
                <CalendarX2 class="h-3 w-3" />
                {{ isSurveyExpired(survey) ? 'Clôturé le' : 'Clôture le' }} {{ formatDate(survey.closes_at) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-2">
            <!-- Stats (sondages actifs ou fermés avec des réponses potentielles) -->
            <NuxtLink
              v-if="survey.status !== 'draft'"
              :to="`/grh/surveys/${survey.id}/stats`"
              class="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
            >
              <BarChart3 class="h-3.5 w-3.5" />
              Résultats
            </NuxtLink>

            <NuxtLink
              :to="`/grh/surveys/${survey.id}/edit`"
              class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil class="h-3.5 w-3.5" />
              Modifier
            </NuxtLink>

            <button
              v-if="!isSurveyExpired(survey)"
              @click="openSendModal(survey.id)"
              class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              <Send class="h-3.5 w-3.5" />
              Envoyer
            </button>

            <button
              @click="openDeleteModal(survey.id)"
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== MODAL ENVOI ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showSendModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeSendModal"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeSendModal" />

          <!-- Panneau -->
          <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">

            <!-- Header modal -->
            <div class="flex items-start justify-between border-b p-6">
              <div>
                <h3 class="text-lg font-bold text-gray-900">Envoyer le sondage</h3>
                <p class="mt-1 text-sm text-gray-500 line-clamp-1">{{ surveyToSend?.title }}</p>
              </div>
              <button
                @click="closeSendModal"
                class="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Corps modal -->
            <div class="p-6">
              <p class="mb-4 text-sm font-medium text-gray-700">
                Sélectionnez les départements destinataires :
              </p>

              <!-- Tout sélectionner -->
              <label class="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  :checked="selectedDepartments.length === DEPARTMENTS.length"
                  :indeterminate="selectedDepartments.length > 0 && selectedDepartments.length < DEPARTMENTS.length"
                  @change="toggleAllDepartments"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-semibold text-gray-800">Tous les départements</span>
                <span class="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                  {{ DEPARTMENTS.length }}
                </span>
              </label>

              <!-- Départements -->
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="dept in DEPARTMENTS"
                  :key="dept"
                  class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition hover:bg-gray-50"
                  :class="selectedDepartments.includes(dept)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200'"
                >
                  <input
                    type="checkbox"
                    :checked="selectedDepartments.includes(dept)"
                    @change="toggleDepartment(dept)"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                    :class="selectedDepartments.includes(dept) ? 'bg-blue-500' : 'bg-gray-300'"
                  >
                    {{ dept[0] }}
                  </div>
                  <span class="text-sm text-gray-700">{{ dept }}</span>
                </label>
              </div>

              <p v-if="selectedDepartments.length > 0" class="mt-3 text-xs text-blue-600">
                {{ selectedDepartments.length }} département{{ selectedDepartments.length > 1 ? 's' : '' }} sélectionné{{ selectedDepartments.length > 1 ? 's' : '' }}
              </p>
            </div>

            <!-- Footer modal -->
            <div class="flex gap-3 border-t p-6">
              <button
                @click="closeSendModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="handleSendSurvey"
                :disabled="selectedDepartments.length === 0 || sendingLoading"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg v-if="sendingLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <Send v-else class="h-4 w-4" />
                {{ sendingLoading ? 'Envoi...' : 'Envoyer le sondage' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== MODAL SUPPRESSION ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showDeleteModal = false"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 class="h-6 w-6 text-red-600" />
            </div>
            <h3 class="mt-4 text-lg font-bold text-gray-900">Supprimer ce sondage ?</h3>
            <p class="mt-2 text-sm text-gray-500">
              Cette action est irréversible. Le sondage et toutes ses données seront définitivement supprimés.
            </p>
            <div class="mt-6 flex gap-3">
              <button
                @click="showDeleteModal = false"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="confirmDelete"
                class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
