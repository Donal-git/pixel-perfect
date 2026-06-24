<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ChevronLeft, Users, ClipboardList, BarChart3,
  AlertCircle, CheckCircle2, Clock, ChevronDown, UserCheck,
  Sparkles, TrendingUp, TrendingDown, Minus
} from 'lucide-vue-next'
import { useSurveyStore, type Survey, type SurveyResponse } from '~/stores/survey'
import { usePersonnelStore } from '~/stores/personnel'
import { useAuthStore } from '~/stores/auth'
import { analyzeTexts, type TextAnalysis } from '~/utils/textAnalysis'

const route = useRoute()
const surveyStore = useSurveyStore()
const personnelStore = usePersonnelStore()
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
    await Promise.all([
      surveyStore.loadFromStorage(),
      personnelStore.loadFromStorage()
    ])
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

// Réponses groupées par département (via personnel)
const responsesByDepartment = computed(() => {
  const map: Record<string, number> = {}
  for (const resp of submitted.value) {
    const member = personnelStore.members.find(m => m.id === resp.employee_id)
    const dept = member?.department || 'Non assigné'
    map[dept] = (map[dept] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
})

const isClosed = computed(() =>
  !survey.value ? false : surveyStore.isSurveyExpired(survey.value) || survey.value.status === 'closed'
)

// ── Affichage des répondants par option (sondage non anonyme) ─────────────────
const openRespondents = ref<Record<string, string | null>>({})

const toggleRespondents = (questionId: string, optLabel: string) => {
  const current = openRespondents.value[questionId]
  openRespondents.value[questionId] = current === optLabel ? null : optLabel
}

// ── Analyse automatique des réponses textuelles ───────────────────────────────
const openAnalysis = ref<Record<string, boolean>>({})

const toggleAnalysis = (questionId: string) => {
  openAnalysis.value[questionId] = !openAnalysis.value[questionId]
}

const textAnalyses = computed(() => {
  const result: Record<string, TextAnalysis> = {}
  for (const stat of questionStats.value) {
    if (stat.type === 'text' && 'texts' in stat) {
      result[stat.question.id] = analyzeTexts(stat.texts as string[])
    }
  }
  return result
})

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
      const respondentsByOpt: Record<string, string[]> = {}
      for (const opt of question.options) { counts[opt] = 0; respondentsByOpt[opt] = [] }
      for (const resp of submitted.value) {
        const a = resp.answers[question.id]
        if (typeof a === 'string' && counts[a] !== undefined) {
          counts[a]++
          if (!survey.value?.isAnonymous) {
            const member = personnelStore.members.find(m => m.id === resp.employee_id)
            if (member) respondentsByOpt[a].push(member.name)
          }
        }
      }
      const maxCount = Math.max(...Object.values(counts), 1)
      return {
        question, type: 'choice', answeredCount,
        options: question.options.map(opt => ({
          label: opt,
          count: counts[opt],
          pct: answeredCount > 0 ? Math.round((counts[opt] / answeredCount) * 100) : 0,
          barWidth: Math.round((counts[opt] / maxCount) * 100),
          respondents: respondentsByOpt[opt] ?? []
        }))
      }
    }

    if (question.question_type === 'checkbox') {
      const counts: Record<string, number> = {}
      const respondentsByOpt: Record<string, string[]> = {}
      for (const opt of question.options) { counts[opt] = 0; respondentsByOpt[opt] = [] }
      for (const resp of submitted.value) {
        const a = resp.answers[question.id]
        if (Array.isArray(a)) {
          const member = !survey.value?.isAnonymous
            ? personnelStore.members.find(m => m.id === resp.employee_id)
            : undefined
          for (const item of a) {
            if (counts[item] !== undefined) {
              counts[item]++
              if (member) respondentsByOpt[item].push(member.name)
            }
          }
        }
      }
      const maxCount = Math.max(...Object.values(counts), 1)
      return {
        question, type: 'choice', answeredCount,
        options: question.options.map(opt => ({
          label: opt,
          count: counts[opt],
          pct: answeredCount > 0 ? Math.round((counts[opt] / answeredCount) * 100) : 0,
          barWidth: Math.round((counts[opt] / maxCount) * 100),
          respondents: respondentsByOpt[opt] ?? []
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
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>

    <!-- ERREUR -->
    <div v-else-if="hasError || !survey" class="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center">
      <AlertCircle class="h-12 w-12 text-red-400" />
      <p class="mt-4 text-sm font-medium text-gray-900">Sondage introuvable</p>
      <NuxtLink :to="backPath" class="mt-4 text-sm text-teal-600 hover:underline">Retour à la liste</NuxtLink>
    </div>

    <template v-else>

      <!-- CARTES RÉSUMÉ -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <Users class="h-5 w-5 text-teal-600" />
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
            class="rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700"
          >{{ dept }}</span>
        </div>
      </div>

      <!-- PARTICIPATION PAR DÉPARTEMENT -->
      <div v-if="submitted.length > 0" class="rounded-xl border bg-white p-5 shadow-sm">
        <h2 class="mb-4 text-sm font-semibold text-gray-700">Participation par département</h2>
        <div class="space-y-3">
          <div
            v-for="item in responsesByDepartment"
            :key="item.dept"
            class="flex items-center gap-3"
          >
            <span class="w-28 shrink-0 truncate text-xs font-medium text-gray-700" :title="item.dept">
              {{ item.dept }}
            </span>
            <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 18px;">
              <div
                class="h-full rounded-full bg-teal-500 transition-all duration-700"
                :style="{ width: (submitted.length > 0 ? Math.round((item.count / submitted.length) * 100) : 0) + '%' }"
              />
            </div>
            <span class="w-24 shrink-0 text-right text-xs font-medium text-gray-600">
              {{ item.count }} rép. <span class="text-gray-400">({{ submitted.length > 0 ? Math.round((item.count / submitted.length) * 100) : 0 }}%)</span>
            </span>
          </div>
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
          <div v-else-if="stat.type === 'choice'" class="space-y-2">
            <!-- Badge anonyme -->
            <p v-if="survey.isAnonymous" class="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
              <UserCheck class="h-3.5 w-3.5" />
              Sondage anonyme — les répondants ne sont pas affichés
            </p>

            <div v-for="opt in stat.options" :key="opt.label" class="rounded-lg border border-transparent transition-colors"
              :class="!survey.isAnonymous && opt.count > 0 ? 'hover:border-gray-200 hover:bg-gray-50 cursor-pointer' : ''"
              @click="!survey.isAnonymous && opt.count > 0 && toggleRespondents(stat.question.id, opt.label)"
            >
              <!-- Ligne barre -->
              <div class="flex items-center gap-3 px-2 py-1.5">
                <span class="w-36 shrink-0 truncate text-xs text-gray-700" :title="opt.label">
                  {{ opt.label }}
                </span>
                <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 20px;">
                  <div
                    class="h-full rounded-full bg-teal-500 transition-all duration-700"
                    :style="{ width: opt.barWidth + '%' }"
                  />
                </div>
                <span class="w-20 shrink-0 text-right text-xs font-medium text-gray-600">
                  {{ opt.count }} <span class="text-gray-400">({{ opt.pct }}%)</span>
                </span>
                <ChevronDown
                  v-if="!survey.isAnonymous && opt.count > 0"
                  class="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200"
                  :class="openRespondents[stat.question.id] === opt.label ? 'rotate-180' : ''"
                />
                <span v-else class="h-3.5 w-3.5 shrink-0" />
              </div>

              <!-- Liste des répondants -->
              <div
                v-if="!survey.isAnonymous && openRespondents[stat.question.id] === opt.label"
                class="mx-2 mb-2 rounded-md bg-teal-50 px-3 py-2"
              >
                <p class="mb-1.5 text-xs font-semibold text-teal-700 flex items-center gap-1">
                  <UserCheck class="h-3.5 w-3.5" />
                  {{ opt.respondents.length }} personne(s) ont choisi cette réponse
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="name in opt.respondents"
                    :key="name"
                    class="rounded-full bg-white border border-teal-200 px-2.5 py-0.5 text-xs text-teal-800 font-medium"
                  >
                    {{ name }}
                  </span>
                </div>
              </div>
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
          <div v-else-if="stat.type === 'text'" class="space-y-3">
            <div
              v-for="(text, ti) in stat.texts"
              :key="ti"
              class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm italic text-gray-700 leading-relaxed"
            >
              "{{ text }}"
            </div>

            <!-- Bouton analyser (à partir de 2 réponses) -->
            <div v-if="stat.texts && stat.texts.length >= 2" class="pt-1">
              <button
                @click="toggleAnalysis(stat.question.id)"
                class="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
              >
                <Sparkles class="h-4 w-4" />
                {{ openAnalysis[stat.question.id] ? "Masquer l'analyse" : 'Analyser les réponses' }}
              </button>
            </div>

            <!-- Panneau d'analyse -->
            <div
              v-if="stat.texts && stat.texts.length >= 2 && openAnalysis[stat.question.id]"
              class="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-5"
            >
              <!-- En-tête -->
              <div class="flex items-center gap-2 border-b border-indigo-100 pb-3">
                <Sparkles class="h-4 w-4 text-indigo-600" />
                <h3 class="text-sm font-semibold text-indigo-900">Analyse automatique des réponses</h3>
                <span class="ml-auto text-xs text-gray-400">{{ textAnalyses[stat.question.id]?.totalTexts }} réponse(s) analysée(s)</span>
              </div>

              <!-- KPIs -->
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <!-- Sentiment global -->
                <div
                  class="rounded-lg border p-3 text-center"
                  :class="textAnalyses[stat.question.id]?.sentimentLabel === 'Positif'
                    ? 'bg-green-50 border-green-100'
                    : textAnalyses[stat.question.id]?.sentimentLabel === 'Négatif'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-amber-50 border-amber-100'"
                >
                  <TrendingUp
                    v-if="textAnalyses[stat.question.id]?.sentimentLabel === 'Positif'"
                    class="mx-auto mb-1 h-5 w-5 text-green-600"
                  />
                  <TrendingDown
                    v-else-if="textAnalyses[stat.question.id]?.sentimentLabel === 'Négatif'"
                    class="mx-auto mb-1 h-5 w-5 text-red-600"
                  />
                  <Minus v-else class="mx-auto mb-1 h-5 w-5 text-amber-600" />
                  <p
                    class="text-xs font-bold"
                    :class="textAnalyses[stat.question.id]?.sentimentLabel === 'Positif'
                      ? 'text-green-700'
                      : textAnalyses[stat.question.id]?.sentimentLabel === 'Négatif'
                      ? 'text-red-700'
                      : 'text-amber-700'"
                  >{{ textAnalyses[stat.question.id]?.sentimentLabel }}</p>
                  <p class="mt-0.5 text-xs text-gray-400">Sentiment</p>
                </div>

                <!-- Longueur moyenne -->
                <div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
                  <p class="text-xl font-bold text-blue-700">{{ textAnalyses[stat.question.id]?.avgLength }}</p>
                  <p class="text-xs text-blue-600">mots / réponse</p>
                </div>

                <!-- Positives -->
                <div class="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
                  <p class="text-xl font-bold text-green-700">{{ textAnalyses[stat.question.id]?.positiveCount }}</p>
                  <p class="text-xs text-green-600">positives</p>
                </div>

                <!-- À améliorer -->
                <div class="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                  <p class="text-xl font-bold text-red-700">{{ textAnalyses[stat.question.id]?.negativeCount }}</p>
                  <p class="text-xs text-red-600">à améliorer</p>
                </div>
              </div>

              <!-- Distribution des sentiments -->
              <div>
                <p class="mb-2.5 text-xs font-semibold text-gray-600">Distribution des sentiments</p>
                <div class="space-y-2">
                  <div class="flex items-center gap-3">
                    <span class="w-16 shrink-0 text-xs font-medium text-green-700">Positif</span>
                    <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 14px;">
                      <div
                        class="h-full rounded-full bg-green-400 transition-all duration-700"
                        :style="{ width: ((textAnalyses[stat.question.id]?.positiveCount ?? 0) / Math.max(textAnalyses[stat.question.id]?.totalTexts ?? 1, 1) * 100) + '%' }"
                      />
                    </div>
                    <span class="w-7 shrink-0 text-right text-xs text-gray-500">{{ textAnalyses[stat.question.id]?.positiveCount }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="w-16 shrink-0 text-xs font-medium text-amber-700">Neutre</span>
                    <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 14px;">
                      <div
                        class="h-full rounded-full bg-amber-400 transition-all duration-700"
                        :style="{ width: ((textAnalyses[stat.question.id]?.neutralCount ?? 0) / Math.max(textAnalyses[stat.question.id]?.totalTexts ?? 1, 1) * 100) + '%' }"
                      />
                    </div>
                    <span class="w-7 shrink-0 text-right text-xs text-gray-500">{{ textAnalyses[stat.question.id]?.neutralCount }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="w-16 shrink-0 text-xs font-medium text-red-700">Négatif</span>
                    <div class="flex-1 overflow-hidden rounded-full bg-gray-100" style="height: 14px;">
                      <div
                        class="h-full rounded-full bg-red-400 transition-all duration-700"
                        :style="{ width: ((textAnalyses[stat.question.id]?.negativeCount ?? 0) / Math.max(textAnalyses[stat.question.id]?.totalTexts ?? 1, 1) * 100) + '%' }"
                      />
                    </div>
                    <span class="w-7 shrink-0 text-right text-xs text-gray-500">{{ textAnalyses[stat.question.id]?.negativeCount }}</span>
                  </div>
                </div>
              </div>

              <!-- Mots-clés fréquents -->
              <div v-if="textAnalyses[stat.question.id]?.topKeywords.length">
                <p class="mb-2 text-xs font-semibold text-gray-600">Mots-clés les plus fréquents</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="kw in textAnalyses[stat.question.id]?.topKeywords"
                    :key="kw.word"
                    :title="`Mentionné dans ${kw.pct}% des réponses`"
                    class="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-800"
                  >
                    {{ kw.word }}<span class="ml-1 text-indigo-400">{{ kw.pct }}%</span>
                  </span>
                </div>
              </div>

              <!-- Termes positifs / négatifs -->
              <div
                v-if="textAnalyses[stat.question.id]?.positiveWords.length || textAnalyses[stat.question.id]?.negativeWords.length"
                class="grid gap-4 sm:grid-cols-2"
              >
                <div v-if="textAnalyses[stat.question.id]?.positiveWords.length">
                  <p class="mb-1.5 text-xs font-semibold text-green-700">Points positifs identifiés</p>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="w in textAnalyses[stat.question.id]?.positiveWords"
                      :key="w"
                      class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                    >{{ w }}</span>
                  </div>
                </div>
                <div v-if="textAnalyses[stat.question.id]?.negativeWords.length">
                  <p class="mb-1.5 text-xs font-semibold text-red-700">Points à améliorer</p>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="w in textAnalyses[stat.question.id]?.negativeWords"
                      :key="w"
                      class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                    >{{ w }}</span>
                  </div>
                </div>
              </div>
              <div
                v-else
                class="rounded-lg bg-gray-50 py-3 text-center text-xs text-gray-400"
              >
                Aucun terme d'opinion clairement identifiable dans les réponses
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
