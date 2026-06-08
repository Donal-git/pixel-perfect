<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ChevronLeft, Users, ClipboardList, BarChart3,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-vue-next'
import { useSurveyStore, type Survey, type SurveyResponse } from '~/stores/survey'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const surveyStore = useSurveyStore()
const authStore = useAuthStore()

const backPath = computed(() =>
  authStore.role === 'admin' ? '/admin/reports' : '/grh/surveys'
)

const surveyId = route.params.id as string
const survey   = ref<Survey | null>(null)
const responses = ref<SurveyResponse[]>([])
const loading  = ref(true)
const hasError = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await surveyStore.loadFromStorage()
    survey.value = surveyStore.getSurveyById(surveyId)
    if (!survey.value) { hasError.value = true; return }
    responses.value = await surveyStore.getSurveyResponses(surveyId)
  } catch (e) {
    console.error('Erreur chargement stats:', e)
    hasError.value = true
  } finally {
    loading.value = false
  }
})

// Uniquement les réponses soumises (pas les brouillons)
const submitted = computed(() => responses.value.filter(r => r.status === 'submitted'))

const isClosed = computed(() =>
  !survey.value ? false : surveyStore.isSurveyExpired(survey.value) || survey.value.status === 'closed'
)

// ── Calcul des statistiques par question ─────────────────────────────────────
const questionStats = computed(() => {
  if (!survey.value) return []

  return survey.value.questions.map(question => {
    const answers = submitted.value
      .map(r => r.answers[question.id])
      .filter(a => a !== undefined && a !== null && a !== '')

    const answeredCount = answers.length

    if (question.question_type === 'multiple_choice') {
      const counts: Record<string, number> = {}
      for (const opt of question.options) counts[opt] = 0
      for (const a of answers) {
        if (typeof a === 'string' && counts[a] !== undefined) counts[a]++
      }
      const maxCount = Math.max(...Object.values(counts), 1)
      return {
        question, type: 'choice', answeredCount,
        options: question.options.map(opt => ({
          label: opt,
          count: counts[opt],
          pct: answeredCount > 0 ? Math.round((counts[opt] / answeredCount) * 100) : 0,
          barWidth: Math.round((counts[opt] / maxCount) * 100)
        }))
      }
    }

    if (question.question_type === 'checkbox') {
      const counts: Record<string, number> = {}
      for (const opt of question.options) counts[opt] = 0
      for (const a of answers) {
        if (Array.isArray(a)) {
          for (const item of a) if (counts[item] !== undefined) counts[item]++
        }
      }
      const maxCount = Math.max(...Object.values(counts), 1)
      return {
        question, type: 'choice', answeredCount,
        options: question.options.map(opt => ({
          label: opt,
          count: counts[opt],
          pct: answeredCount > 0 ? Math.round((counts[opt] / answeredCount) * 100) : 0,
          barWidth: Math.round((counts[opt] / maxCount) * 100)
        }))
      }
    }

    if (question.question_type === 'likert' || question.question_type === 'rating') {
      const values = answers.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5)
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const v of values) dist[v] = (dist[v] || 0) + 1
      const maxDist = Math.max(...Object.values(dist), 1)
      return {
        question, type: 'scale', answeredCount,
        avg: Math.round(avg * 10) / 10,
        distribution: [1, 2, 3, 4, 5].map(n => ({
          value: n,
          count: dist[n],
          pct: values.length > 0 ? Math.round((dist[n] / values.length) * 100) : 0,
          barWidth: Math.round((dist[n] / maxDist) * 100)
        }))
      }
    }

    if (question.question_type === 'open_text') {
      return {
        question, type: 'text', answeredCount,
        texts: answers.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      }
    }

    return { question, type: 'unknown', answeredCount }
  })
})

const questionTypeLabel: Record<string, string> = {
  multiple_choice: 'Choix multiple',
  checkbox: 'Cases à cocher',
  likert: 'Échelle de Likert',
  rating: 'Notation par étoiles',
  open_text: 'Texte libre'
}

const formatDate = (d?: string) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: 'Actif',      class: 'bg-green-100 text-green-700' },
  draft:  { label: 'Brouillon',  class: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Fermé',      class: 'bg-gray-100 text-gray-500'   }
}

</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">

    <!-- HEADER -->
    <div class="flex items-center gap-4">
      <NuxtLink
        :to="backPath"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
      >
        <ChevronLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold text-gray-900 truncate">{{ survey?.title ?? 'Statistiques' }}</h1>
          <span
            v-if="survey"
            class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="isClosed ? 'bg-gray-100 text-gray-500' : statusConfig[survey.status]?.class"
          >
            {{ isClosed && survey.status !== 'closed' ? 'Clôturé (date dépassée)' : statusConfig[survey.status]?.label }}
          </span>
        </div>
        <p class="text-sm text-gray-500 mt-0.5">Résultats et statistiques en temps réel</p>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>

    <!-- ERREUR -->
    <div v-else-if="hasError || !survey" class="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center">
      <AlertCircle class="h-12 w-12 text-red-400" />
      <p class="mt-4 text-sm font-medium text-gray-900">Sondage introuvable</p>
      <NuxtLink :to="backPath" class="mt-4 text-sm text-blue-600 hover:underline">Retour à la liste</NuxtLink>
    </div>

    <template v-else>

      <!-- CARTES RÉSUMÉ -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Users class="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ submitted.length }}</p>
              <p class="text-xs text-gray-500">répondant(s)</p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
              <ClipboardList class="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ survey.questions.length }}</p>
              <p class="text-xs text-gray-500">questions</p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <BarChart3 class="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ survey.sent_to.length || '—' }}</p>
              <p class="text-xs text-gray-500">département(s) ciblé(s)</p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              :class="isClosed ? 'bg-gray-100' : 'bg-green-100'"
            >
              <CheckCircle2 v-if="!isClosed" class="h-5 w-5 text-green-600" />
              <Clock v-else class="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900">{{ isClosed ? 'Clôturé' : 'En cours' }}</p>
              <p class="text-xs text-gray-500">
                <template v-if="survey.closes_at">
                  {{ isClosed ? `Fermé le ${formatDate(survey.closes_at)}` : `Jusqu\'au ${formatDate(survey.closes_at)}` }}
                </template>
                <template v-else>Pas de date limite</template>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- DÉPARTEMENTS CIBLÉS -->
      <div v-if="survey.sent_to.length > 0" class="rounded-xl border bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">Départements destinataires</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="dept in survey.sent_to"
            :key="dept"
            class="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
          >{{ dept }}</span>
        </div>
      </div>

      <!-- RÉSULTATS — AUCUNE RÉPONSE -->
      <div
        v-if="submitted.length === 0"
        class="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center shadow-sm"
      >
        <BarChart3 class="h-14 w-14 text-gray-200" />
        <p class="mt-4 text-sm font-medium text-gray-900">Aucune réponse pour l'instant</p>
        <p class="mt-1 text-xs text-gray-500">
          Les résultats apparaîtront ici dès que des employés auront soumis leurs réponses.
        </p>
      </div>

      <!-- RÉSULTATS PAR QUESTION -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">Résultats par question</h2>
          <span class="text-xs text-gray-400">{{ submitted.length }} réponse(s) soumise(s)</span>
        </div>

        <div
          v-for="(stat, idx) in questionStats"
          :key="stat.question.id"
          class="rounded-xl border bg-white p-6 shadow-sm"
        >
          <!-- En-tête question -->
          <div class="mb-5 flex items-start gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
              {{ idx + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900">{{ stat.question.question_text }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {{ questionTypeLabel[stat.question.question_type] }}
                </span>
                <span class="text-xs text-gray-400">
                  {{ stat.answeredCount }} / {{ submitted.length }} réponse(s)
                </span>
                <span
                  v-if="stat.question.is_required"
                  class="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500"
                >obligatoire</span>
              </div>
            </div>
          </div>

          <!-- Aucune réponse à cette question -->
          <div
            v-if="stat.answeredCount === 0"
            class="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400"
          >
            Aucune réponse à cette question
          </div>

          <!-- Choix multiple / Cases à cocher -->
          <div v-else-if="stat.type === 'choice'" class="space-y-3">
            <div v-for="opt in stat.options" :key="opt.label" class="flex items-center gap-3">
              <span class="w-36 shrink-0 truncate text-xs text-gray-700" :title="opt.label">
                {{ opt.label }}
              </span>
              <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 20px;">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-700"
                  :style="{ width: opt.barWidth + '%' }"
                />
              </div>
              <span class="w-20 shrink-0 text-right text-xs font-medium text-gray-600">
                {{ opt.count }} <span class="text-gray-400">({{ opt.pct }}%)</span>
              </span>
            </div>
          </div>

          <!-- Likert / Rating -->
          <div v-else-if="stat.type === 'scale'">
            <!-- Moyenne -->
            <div class="mb-5 flex items-center gap-4 rounded-lg bg-gray-50 p-4">
              <div class="text-4xl font-bold text-gray-900">{{ stat.avg }}</div>
              <div>
                <div class="flex gap-0.5 text-2xl leading-none">
                  <span
                    v-for="n in 5"
                    :key="n"
                    :class="n <= Math.round(stat.avg ?? 0) ? 'text-amber-400' : 'text-gray-200'"
                  >★</span>
                </div>
                <p class="mt-1 text-xs text-gray-500">Moyenne sur {{ stat.answeredCount }} réponse(s)</p>
              </div>
            </div>
            <!-- Distribution -->
            <div class="space-y-2.5">
              <div v-for="d in stat.distribution" :key="d.value" class="flex items-center gap-3">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600">
                  {{ d.value }}
                </span>
                <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 16px;">
                  <div
                    class="h-full rounded-full bg-amber-400 transition-all duration-700"
                    :style="{ width: d.barWidth + '%' }"
                  />
                </div>
                <span class="w-20 shrink-0 text-right text-xs font-medium text-gray-600">
                  {{ d.count }} <span class="text-gray-400">({{ d.pct }}%)</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Texte libre -->
          <div v-else-if="stat.type === 'text'" class="space-y-2">
            <div
              v-for="(text, ti) in stat.texts"
              :key="ti"
              class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm italic text-gray-700 leading-relaxed"
            >
              "{{ text }}"
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
