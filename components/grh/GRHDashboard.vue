<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  ClipboardList, Send, GraduationCap, Users,
  AlertTriangle, Info, TrendingUp, Plus
} from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { usePersonnelStore } from '~/stores/personnel'
import ParticipationChart from '@/components/grh/ParticipationChart.vue'
import SatisfactionChart from '@/components/grh/SatisfactionChart.vue'
import TrainingNeedsCard from '@/components/grh/TrainingCard.vue'
import DepartmentStats from '@/components/grh/DepartmentStats.vue'
import RecentSurveys from '@/components/grh/RecentSurveys.vue'

const surveyStore = useSurveyStore()
const formationStore = useFormationStore()
const personnelStore = usePersonnelStore()

onMounted(async () => {
  await Promise.all([
    personnelStore.loadFromStorage(),
    surveyStore.loadFromStorage(),
    surveyStore.loadAllResponses(),
    formationStore.loadFromStorage()
  ])
})

const deptSurveyMap = computed(() => {
  const m: Record<string, { total: number; active: number; questions: number }> = {}
  for (const s of surveyStore.surveys) {
    for (const dept of s.sent_to) {
      if (!m[dept]) m[dept] = { total: 0, active: 0, questions: 0 }
      m[dept].total++
      if (s.status === 'active') m[dept].active++
      m[dept].questions += s.questions.length
    }
  }
  return m
})

const departmentParticipation = computed(() => {
  const departments = new Set(surveyStore.surveys.flatMap(s => s.sent_to))
  const result: { name: string; rate: number; surveysCount: number; activeCount: number; responseCount: number; employeeCount: number }[] = []
  for (const dept of departments) {
    const deptSurveys = deptSurveyMap.value[dept]
    const deptEmployees = personnelStore.members.filter(m => m.department === dept && m.role === 'employee')
    const deptResponses = surveyStore.responses.filter(r => {
      const employee = personnelStore.members.find(e => e.id === r.employee_id)
      return employee?.department === dept && r.status === 'submitted'
    })
    const rate = deptEmployees.length > 0
      ? Math.round((deptResponses.length / deptEmployees.length) * 100) : 0
    result.push({ name: dept, rate, surveysCount: deptSurveys?.total || 0, activeCount: deptSurveys?.active || 0, responseCount: deptResponses.length, employeeCount: deptEmployees.length })
  }
  return result.sort((a, b) => b.rate - a.rate)
})

const surveySynthesis = computed(() => {
  const s = surveyStore.surveys
  const depts = new Set(s.flatMap(x => x.sent_to))
  const avgP = departmentParticipation.value.length
    ? Math.round(departmentParticipation.value.reduce((a, d) => a + d.rate, 0) / departmentParticipation.value.length) : 0
  return {
    total: s.length,
    active: s.filter(x => x.status === 'active').length,
    draft: s.filter(x => x.status === 'draft').length,
    closed: s.filter(x => x.status === 'closed').length,
    avgQuestions: s.length ? Math.round(s.reduce((a, x) => a + x.questions.length, 0) / s.length) : 0,
    deptsReached: depts.size,
    avgParticipation: avgP
  }
})

const formationsByCategory = computed(() => {
  const m: Record<string, { count: number; participants: number; available: number }> = {}
  for (const f of formationStore.formations) {
    if (!m[f.category]) m[f.category] = { count: 0, participants: 0, available: 0 }
    m[f.category].count++
    m[f.category].participants += f.participants
    if (f.status === 'disponible') m[f.category].available++
  }
  return Object.entries(m).map(([category, d]) => ({ category, ...d })).sort((a, b) => b.participants - a.participants)
})

const deptActivity = computed(() => {
  const m: Record<string, { formations: number; participants: number; surveysReceived: number }> = {}
  for (const f of formationStore.formations) {
    for (const dept of f.departments) {
      if (!m[dept]) m[dept] = { formations: 0, participants: 0, surveysReceived: 0 }
      m[dept].formations++
      m[dept].participants += f.participants
    }
  }
  for (const [name, data] of Object.entries(deptSurveyMap.value)) {
    if (!m[name]) m[name] = { formations: 0, participants: 0, surveysReceived: 0 }
    m[name].surveysReceived = data.total
  }
  return Object.entries(m).map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.participants + b.surveysReceived * 10 - (a.participants + a.surveysReceived * 10))
    .slice(0, 8)
})

const alerts = computed(() => {
  const list: { type: 'warning' | 'info'; message: string }[] = []
  if (surveySynthesis.value.draft > 0)
    list.push({ type: 'warning', message: `${surveySynthesis.value.draft} sondage(s) en brouillon — à publier pour collecter des réponses` })
  const lowPart = departmentParticipation.value.filter(d => d.rate < 65)
  if (lowPart.length)
    list.push({ type: 'warning', message: `Participation faible (< 65 %) : ${lowPart.map(d => d.name).join(', ')}` })
  const highDemand = formationStore.formations.filter(f => f.status === 'en_cours' && f.participants > 20)
  if (highDemand.length)
    list.push({ type: 'info', message: `${highDemand.length} formation(s) en cours avec forte demande (> 20 participants)` })
  if (!surveySynthesis.value.active && surveySynthesis.value.total > 0)
    list.push({ type: 'info', message: "Aucun sondage actif — envisagez d'en publier un pour recueillir des avis" })
  return list
})

const totalParticipants = computed(() => formationStore.formations.reduce((a, f) => a + f.participants, 0))
const availableFormations = computed(() => formationStore.formations.filter(f => f.status === 'disponible').length)
const recentSurveys = computed(() =>
  [...surveyStore.surveys].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
)
</script>

<template>
  <div class="space-y-8">

    <!-- HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Tableau de bord GRH</h1>
        <p class="mt-1 text-sm text-slate-500">
          Analyse des sondages, participation par département et besoins en formation
        </p>
      </div>
      <NuxtLink
        to="/grh/surveys/create"
        class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
      >
        <Plus class="h-4 w-4" />
        Nouveau sondage
      </NuxtLink>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
            <ClipboardList class="h-4 w-4 text-teal-600" />
          </div>
          <p class="text-xs font-medium text-slate-500">Sondages actifs</p>
        </div>
        <p class="text-2xl font-bold text-slate-900">{{ surveySynthesis.active }}</p>
        <p class="mt-0.5 text-xs text-slate-400">sur {{ surveySynthesis.total }} total</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp class="h-4 w-4 text-emerald-600" />
          </div>
          <p class="text-xs font-medium text-slate-500">Participation moy.</p>
        </div>
        <p class="text-2xl font-bold text-slate-900">
          {{ surveySynthesis.avgParticipation > 0 ? `${surveySynthesis.avgParticipation}%` : '—' }}
        </p>
        <p class="mt-0.5 text-xs text-slate-400">taux estimé</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Send class="h-4 w-4 text-slate-600" />
          </div>
          <p class="text-xs font-medium text-slate-500">Dép. touchés</p>
        </div>
        <p class="text-2xl font-bold text-slate-900">{{ surveySynthesis.deptsReached }}</p>
        <p class="mt-0.5 text-xs text-slate-400">par les sondages</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
            <GraduationCap class="h-4 w-4 text-teal-600" />
          </div>
          <p class="text-xs font-medium text-slate-500">Formations dispo.</p>
        </div>
        <p class="text-2xl font-bold text-slate-900">{{ availableFormations }}</p>
        <p class="mt-0.5 text-xs text-slate-400">sur {{ formationStore.formations.length }}</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Users class="h-4 w-4 text-slate-600" />
          </div>
          <p class="text-xs font-medium text-slate-500">Participants</p>
        </div>
        <p class="text-2xl font-bold text-slate-900">{{ totalParticipants }}</p>
        <p class="mt-0.5 text-xs text-slate-400">inscrits formations</p>
      </div>

      <div
        class="rounded-xl border p-4 shadow-sm transition"
        :class="alerts.length ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'"
      >
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg"
            :class="alerts.length ? 'bg-amber-100' : 'bg-slate-100'">
            <AlertTriangle class="h-4 w-4" :class="alerts.length ? 'text-amber-600' : 'text-slate-400'" />
          </div>
          <p class="text-xs font-medium text-slate-500">Alertes RH</p>
        </div>
        <p class="text-2xl font-bold" :class="alerts.length ? 'text-amber-700' : 'text-slate-300'">
          {{ alerts.length }}
        </p>
        <p class="mt-0.5 text-xs text-slate-400">{{ alerts.length > 0 ? 'à traiter' : 'tout va bien' }}</p>
      </div>
    </div>

    <!-- GRAPHIQUES -->
    <div class="grid gap-6 lg:grid-cols-2">
      <ParticipationChart :departments="departmentParticipation" />
      <SatisfactionChart :synthesis="surveySynthesis" />
    </div>

    <!-- FORMATIONS + ACTIVITÉ PAR DÉPARTEMENT -->
    <div class="grid gap-6 lg:grid-cols-2">
      <TrainingNeedsCard :categories="formationsByCategory" />
      <DepartmentStats :departments="deptActivity" />
    </div>

    <!-- ALERTES RH -->
    <div v-if="alerts.length > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        Alertes RH — {{ alerts.length }} point{{ alerts.length > 1 ? 's' : '' }} à surveiller
      </h2>
      <ul class="space-y-2">
        <li
          v-for="(alert, i) in alerts"
          :key="i"
          class="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
          :class="alert.type === 'warning' ? 'bg-amber-100/80' : 'bg-teal-50'"
        >
          <AlertTriangle v-if="alert.type === 'warning'" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <Info v-else class="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <span class="text-sm" :class="alert.type === 'warning' ? 'text-amber-800' : 'text-teal-800'">
            {{ alert.message }}
          </span>
        </li>
      </ul>
    </div>

    <!-- SONDAGES RÉCENTS -->
    <RecentSurveys :surveys="recentSurveys" />

  </div>
</template>
