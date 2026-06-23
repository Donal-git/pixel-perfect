<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ClipboardList, GraduationCap, CheckCircle2, Clock,
  BookOpen, User, ChevronRight, Calendar, LayoutList, LayoutGrid
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const surveyStore = useSurveyStore()
const formationStore = useFormationStore()

const currentUser = computed(() => authStore.user)

const surveys = ref<any[]>([])
const formations = ref<any[]>([])
const myFormations = ref<any[]>([])
const formationViewMode = ref<'grid' | 'list'>('grid')
const respondedSurveys = ref<Set<string>>(new Set())
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      surveyStore.loadFromStorage(),
      surveyStore.loadResponsesFromStorage(),
      formationStore.loadFromStorage(),
      formationStore.loadRegistrationsFromStorage()
    ])
    const dept = currentUser.value?.department as string | undefined
    surveys.value = surveyStore.getSurveysForDepartment(dept)
    formations.value = formationStore.getFormationsForDepartment(dept)
    if (currentUser.value?.id) {
      myFormations.value = await formationStore.getEmployeeFormations(currentUser.value.id)
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

const goToSurvey = (surveyId: string) => router.push(`/surveys/${surveyId}/response`)
const goToMySurveys = () => router.push('/employee/surveys')
const goToProfile = () => router.push('/employee/profile')

const registerForFormation = async (formationId: string) => {
  if (currentUser.value?.id) {
    try {
      await formationStore.registerForFormation(formationId, currentUser.value.id)
      myFormations.value = await formationStore.getEmployeeFormations(currentUser.value.id)
    } catch (error) { console.error('Erreur inscription formation:', error) }
  }
}

const unregisterFromFormation = async (formationId: string) => {
  if (currentUser.value?.id) {
    try {
      await formationStore.unregisterFromFormation(formationId, currentUser.value.id)
      myFormations.value = await formationStore.getEmployeeFormations(currentUser.value.id)
    } catch (error) { console.error('Erreur désinscription formation:', error) }
  }
}

const stats = computed(() => ({
  surveysPending: surveys.value.filter(s => !respondedSurveys.value.has(s.id)).length,
  surveysCompleted: respondedSurveys.value.size,
  totalSurveys: surveys.value.length,
  formationsRegistered: myFormations.value.length,
  formationsAvailable: formations.value.length
}))

const isRegisteredForFormation = (formationId: string) =>
  myFormations.value.some((f) => f.id === formationId)

const isFormationExpired = (formation: any) => {
  if (!formation.end_date) return false
  return new Date(formation.end_date) < new Date()
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const levelClass = (level: string) => ({
  'débutant':      'bg-emerald-50 text-emerald-700',
  'intermédiaire': 'bg-amber-50 text-amber-700',
  'avancé':        'bg-red-50 text-red-700',
}[level] ?? 'bg-slate-100 text-slate-600')
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Mon Espace</h1>
        <p class="mt-1 text-sm text-slate-500">
          Bienvenue {{ currentUser?.name || currentUser?.email }} — {{ currentUser?.department || 'Employé' }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          @click="goToMySurveys"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ClipboardList class="h-4 w-4" />
          Mes sondages
        </button>
        <button
          @click="goToProfile"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          <User class="h-4 w-4" />
          Mon profil
        </button>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>

    <div v-else class="space-y-6">

      <!-- STATS -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">En attente</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ stats.surveysPending }}</p>
          <p class="mt-0.5 text-xs text-slate-400">sur {{ stats.totalSurveys }} sondages</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Complétés</p>
          <p class="mt-2 text-2xl font-bold text-emerald-600">{{ stats.surveysCompleted }}</p>
          <p class="mt-0.5 text-xs text-slate-400">réponses envoyées</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Mes formations</p>
          <p class="mt-2 text-2xl font-bold text-teal-600">{{ stats.formationsRegistered }}</p>
          <p class="mt-0.5 text-xs text-slate-400">inscriptions</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Disponibles</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ stats.formationsAvailable }}</p>
          <p class="mt-0.5 text-xs text-slate-400">formations</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Rôle</p>
          <p class="mt-2 text-lg font-bold capitalize text-slate-900">{{ currentUser?.accountType || '—' }}</p>
          <p class="mt-0.5 text-xs text-slate-400">{{ currentUser?.department || '—' }}</p>
        </div>
      </div>

      <!-- SONDAGES -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList class="h-4 w-4 text-slate-400" />
            Sondages
          </h2>
          <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {{ stats.surveysPending }} en attente
          </span>
        </div>

        <div v-if="surveys.length === 0" class="py-12 text-center">
          <ClipboardList class="mx-auto h-8 w-8 text-slate-300" />
          <p class="mt-3 text-sm text-slate-500">Aucun sondage disponible pour le moment</p>
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="survey in surveys"
            :key="survey.id"
            class="flex items-center gap-4 px-6 py-4 transition"
            :class="surveyStore.isSurveyExpired(survey) ? 'opacity-60' : 'hover:bg-slate-50'"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              :class="respondedSurveys.has(survey.id) ? 'bg-emerald-50' : surveyStore.isSurveyExpired(survey) ? 'bg-slate-100' : 'bg-teal-50'">
              <CheckCircle2 v-if="respondedSurveys.has(survey.id)" class="h-4 w-4 text-emerald-600" />
              <Clock v-else-if="surveyStore.isSurveyExpired(survey)" class="h-4 w-4 text-slate-400" />
              <ClipboardList v-else class="h-4 w-4 text-teal-600" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900">{{ survey.title }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span v-if="respondedSurveys.has(survey.id)"
                  class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Répondu</span>
                <span v-else-if="surveyStore.isSurveyExpired(survey)"
                  class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Clôturé</span>
                <span v-else
                  class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">En attente</span>
                <span v-if="survey.closes_at && !surveyStore.isSurveyExpired(survey)"
                  class="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar class="h-3 w-3" />
                  Clôture le {{ formatDate(survey.closes_at) }}
                </span>
              </div>
            </div>

            <button
              @click="goToSurvey(survey.id)"
              :disabled="respondedSurveys.has(survey.id) || surveyStore.isSurveyExpired(survey)"
              class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition"
              :class="respondedSurveys.has(survey.id) || surveyStore.isSurveyExpired(survey)
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700'"
            >
              {{ respondedSurveys.has(survey.id) ? 'Complété' : surveyStore.isSurveyExpired(survey) ? 'Clôturé' : 'Répondre' }}
            </button>
          </div>
        </div>
      </div>

      <!-- FORMATIONS DISPONIBLES -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap class="h-4 w-4 text-slate-400" />
            Formations disponibles
          </h2>
          <div class="flex items-center gap-2">
            <!-- Toggle vue liste / grille -->
            <div class="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
              <button
                @click="formationViewMode = 'grid'"
                title="Vue grille"
                class="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition"
                :class="formationViewMode === 'grid' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'"
              >
                <LayoutGrid class="h-3.5 w-3.5" />
                Grille
              </button>
              <button
                @click="formationViewMode = 'list'"
                title="Vue liste"
                class="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition"
                :class="formationViewMode === 'list' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'"
              >
                <LayoutList class="h-3.5 w-3.5" />
                Liste
              </button>
            </div>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {{ formations.length }} disponibles
            </span>
          </div>
        </div>

        <div v-if="formations.length === 0" class="py-12 text-center">
          <GraduationCap class="mx-auto h-8 w-8 text-slate-300" />
          <p class="mt-3 text-sm text-slate-500">Aucune formation disponible pour le moment</p>
        </div>

        <!-- VUE GRILLE -->
        <div v-else-if="formationViewMode === 'grid'" class="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="formation in formations"
            :key="formation.id"
            class="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
            :class="isFormationExpired(formation) ? 'opacity-70' : ''"
          >
            <div class="mb-3 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="text-sm font-semibold leading-snug text-slate-900">{{ formation.title }}</h3>
                <p class="mt-0.5 text-xs text-slate-500">{{ formation.category }}</p>
              </div>
              <span v-if="isFormationExpired(formation)"
                class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Clôturé</span>
              <span v-else-if="isRegisteredForFormation(formation.id)"
                class="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Inscrit</span>
            </div>

            <p class="mb-3 line-clamp-2 text-xs text-slate-500">{{ formation.description }}</p>

            <div class="mb-4 space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Durée</span>
                <span class="font-medium text-slate-700">{{ formation.duration }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Niveau</span>
                <span class="rounded-full px-2 py-0.5 font-medium" :class="levelClass(formation.level)">{{ formation.level }}</span>
              </div>
              <div v-if="formation.start_date || formation.end_date" class="flex items-center justify-between">
                <span class="text-slate-400">Période</span>
                <span class="font-medium" :class="isFormationExpired(formation) ? 'text-red-500' : 'text-slate-700'">
                  <template v-if="formation.start_date && formation.end_date">
                    {{ formatDate(formation.start_date) }} → {{ formatDate(formation.end_date) }}
                  </template>
                  <template v-else-if="formation.end_date">Jusqu'au {{ formatDate(formation.end_date) }}</template>
                  <template v-else>Début : {{ formatDate(formation.start_date) }}</template>
                </span>
              </div>
            </div>

            <div class="mt-auto">
              <button
                v-if="isFormationExpired(formation) && !isRegisteredForFormation(formation.id)"
                disabled
                class="w-full rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-400 cursor-not-allowed"
              >Inscriptions clôturées</button>

              <div v-else-if="isFormationExpired(formation) && isRegisteredForFormation(formation.id)" class="space-y-2">
                <p class="rounded-lg bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-700">
                  Inscrit · Inscriptions clôturées
                </p>
                <button
                  @click="unregisterFromFormation(formation.id)"
                  class="w-full rounded-lg bg-red-50 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                >Se désinscrire</button>
              </div>

              <button
                v-else
                @click="isRegisteredForFormation(formation.id) ? unregisterFromFormation(formation.id) : registerForFormation(formation.id)"
                class="w-full rounded-lg py-2 text-xs font-medium transition"
                :class="isRegisteredForFormation(formation.id)
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-teal-600 text-white hover:bg-teal-700'"
              >{{ isRegisteredForFormation(formation.id) ? 'Se désinscrire' : "S'inscrire" }}</button>
            </div>
          </div>
        </div>

        <!-- VUE LISTE -->
        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="formation in formations"
            :key="formation.id"
            class="flex items-center gap-4 px-6 py-4 transition"
            :class="isFormationExpired(formation) ? 'opacity-70' : 'hover:bg-slate-50'"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <GraduationCap class="h-4 w-4 text-teal-600" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-medium text-slate-900">{{ formation.title }}</p>
                <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ formation.category }}</span>
                <span v-if="isFormationExpired(formation)"
                  class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Clôturé</span>
                <span v-else-if="isRegisteredForFormation(formation.id)"
                  class="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Inscrit</span>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="levelClass(formation.level)">{{ formation.level }}</span>
              </div>
              <div class="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span v-if="formation.duration" class="flex items-center gap-1">
                  <Clock class="h-3 w-3" />
                  {{ formation.duration }}
                </span>
                <span v-if="formation.start_date || formation.end_date" class="flex items-center gap-1"
                  :class="isFormationExpired(formation) ? 'text-red-400' : ''">
                  <Calendar class="h-3 w-3" />
                  <template v-if="formation.start_date && formation.end_date">
                    {{ formatDate(formation.start_date) }} → {{ formatDate(formation.end_date) }}
                  </template>
                  <template v-else-if="formation.end_date">Jusqu'au {{ formatDate(formation.end_date) }}</template>
                  <template v-else>Début : {{ formatDate(formation.start_date) }}</template>
                </span>
              </div>
            </div>
            <div class="shrink-0">
              <button
                v-if="isFormationExpired(formation) && !isRegisteredForFormation(formation.id)"
                disabled
                class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
              >Clôturé</button>
              <div v-else-if="isFormationExpired(formation) && isRegisteredForFormation(formation.id)" class="flex flex-col gap-1 items-end">
                <span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Inscrit · Clôturé</span>
                <button
                  @click="unregisterFromFormation(formation.id)"
                  class="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                >Se désinscrire</button>
              </div>
              <button
                v-else
                @click="isRegisteredForFormation(formation.id) ? unregisterFromFormation(formation.id) : registerForFormation(formation.id)"
                class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                :class="isRegisteredForFormation(formation.id)
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-teal-600 text-white hover:bg-teal-700'"
              >{{ isRegisteredForFormation(formation.id) ? 'Se désinscrire' : "S'inscrire" }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MES FORMATIONS INSCRITES -->
      <div v-if="myFormations.length > 0" class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-6 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen class="h-4 w-4 text-slate-400" />
            Mes formations inscrites
            <span class="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">{{ myFormations.length }}</span>
          </h2>
        </div>
        <div class="divide-y divide-slate-100">
          <div
            v-for="formation in myFormations"
            :key="formation.id"
            class="flex items-center gap-4 px-6 py-4"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <GraduationCap class="h-4 w-4 text-teal-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900">{{ formation.title }}</p>
              <p class="mt-0.5 text-xs text-slate-500">{{ formation.description }}</p>
            </div>
            <div class="shrink-0 text-right text-xs text-slate-400">
              <p>{{ formation.duration }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
