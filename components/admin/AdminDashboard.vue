<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Users, FileText, GraduationCap, TrendingUp,
  Activity, CheckCircle
} from 'lucide-vue-next'
import { usePersonnelStore } from '~/stores/personnel'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { useAppConfigStore } from '~/stores/appConfig'

const personnelStore = usePersonnelStore()
const surveyStore = useSurveyStore()
const formationStore = useFormationStore()
const appConfigStore = useAppConfigStore()

onMounted(async () => {
  await Promise.all([
    personnelStore.loadFromStorage(),
    surveyStore.loadFromStorage(),
    surveyStore.loadAllResponses({ status: 'submitted' }),
    formationStore.loadFromStorage(),
    appConfigStore.loadFromStorage()
  ])
})

const stats = computed(() => {
  const members = personnelStore.members
  const surveys = surveyStore.surveys
  const responses = surveyStore.responses
  const formations = formationStore.formations

  const totalUsers = members.length
  const activeUsers = members.filter(m => m.status === 'actif').length
  const inactiveUsers = members.filter(m => m.status === 'inactif').length
  const adminCount = members.filter(m => m.role === 'admin').length
  const grhCount = members.filter(m => m.role === 'grh').length
  const employeeCount = members.filter(m => m.role === 'employee').length

  const activeSurveys = surveys.filter(s => s.status === 'active').length
  const draftSurveys = surveys.filter(s => s.status === 'draft').length
  const closedSurveys = surveys.filter(s => s.status === 'closed').length

  const availableFormations = formations.filter(f => f.status === 'disponible').length
  const ongoingFormations = formations.filter(f => f.status === 'en_cours').length
  const totalParticipants = formations.reduce((sum, f) => sum + f.participants, 0)

  const submittedResponses = responses.filter(r => r.status === 'submitted').length
  const avgParticipationRate = employeeCount > 0
    ? Math.round((submittedResponses / employeeCount) * 100) : 0

  return {
    totalUsers, activeUsers, inactiveUsers, adminCount, grhCount, employeeCount,
    activeSurveys, draftSurveys, closedSurveys,
    availableFormations, ongoingFormations, totalParticipants,
    avgParticipationRate,
    departmentCount: personnelStore.byDepartment.length
  }
})

const recentActivities = computed(() => {
  const activities: { action: string; user: string; time: string; type: 'survey' | 'personnel' | 'formation' }[] = []
  surveyStore.surveys.slice(0, 3).forEach(s => {
    activities.push({
      action: `Sondage "${s.title}"`,
      user: s.status === 'active' ? 'En cours' : s.status === 'draft' ? 'Brouillon' : 'Terminé',
      time: formatRelativeTime(s.created_at),
      type: 'survey'
    })
  })
  formationStore.formations.slice(0, 2).forEach(f => {
    activities.push({
      action: `Formation "${f.title}"`,
      user: `${f.participants} participants`,
      time: formatRelativeTime(f.created_at),
      type: 'formation'
    })
  })
  personnelStore.members.slice(0, 2).forEach(m => {
    activities.push({
      action: `${m.name} a rejoint`,
      user: m.department,
      time: formatRelativeTime(m.registeredAt),
      type: 'personnel'
    })
  })
  return activities.sort((a, b) => {
    const timeA = a.time.includes('minutes') ? 1 : a.time.includes('heures') ? 2 : a.time.includes('jours') ? 3 : 4
    const timeB = b.time.includes('minutes') ? 1 : b.time.includes('heures') ? 2 : b.time.includes('jours') ? 3 : 4
    return timeA - timeB
  }).slice(0, 6)
})

const systemStatus = computed(() => {
  const config = appConfigStore.config
  return [
    { label: 'Configuration', status: config.companyName || 'Défaut', ok: true },
    { label: 'Sondages/mois', status: `${surveyStore.surveys.length}/${config.maxSurveysPerMonth}`, ok: surveyStore.surveys.length < config.maxSurveysPerMonth },
    { label: 'Sondages anonymes', status: config.allowAnonymousSurveys ? 'Autorisés' : 'Interdits', ok: true },
    { label: 'Départements', status: `${appConfigStore.departments.length} actifs`, ok: true }
  ]
})

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours} h`
  if (diffDays < 30) return `Il y a ${diffDays} j`
  return date.toLocaleDateString('fr-FR')
}

const activityIcon = (type: 'survey' | 'personnel' | 'formation') => {
  switch (type) {
    case 'survey': return FileText
    case 'personnel': return Users
    case 'formation': return GraduationCap
    default: return Activity
  }
}

const activityColor = (type: 'survey' | 'personnel' | 'formation') => {
  switch (type) {
    case 'survey': return 'bg-teal-600'
    case 'personnel': return 'bg-slate-500'
    case 'formation': return 'bg-emerald-600'
    default: return 'bg-slate-400'
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Tableau de bord administrateur</h1>
      <p class="mt-1 text-sm text-slate-500">Vue d'ensemble du système</p>
    </div>

    <!-- KPI CARDS -->
    <div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">


      <div class="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-4">

        <!-- Total utilisateurs -->
        <div class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-slate-500">Total utilisateurs</p>
              <p class="mt-1 text-3xl font-bold text-slate-900">
                {{ stats.totalUsers }}
              </p>
            </div>

            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <Users class="h-6 w-6 text-teal-600" />
            </div>
          </div>

          <p class="mt-3 truncate text-xs text-slate-400">
            {{ stats.activeUsers }} actifs · {{ stats.inactiveUsers }} inactifs
          </p>
        </div>


        <!-- Sondages actifs -->
        <div class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-slate-500">Sondages actifs</p>
              <p class="mt-1 text-3xl font-bold text-slate-900">
                {{ stats.activeSurveys }}
              </p>
            </div>

            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <FileText class="h-6 w-6 text-emerald-600" />
            </div>
          </div>

          <p class="mt-3 truncate text-xs text-slate-400">
            {{ stats.draftSurveys }} brouillon(s) · {{ stats.closedSurveys }} terminé(s)
          </p>
        </div>


        <!-- Formations en cours -->
        <div class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-slate-500">Formations en cours</p>
              <p class="mt-1 text-3xl font-bold text-slate-900">
                {{ stats.ongoingFormations }}
              </p>
            </div>

            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <GraduationCap class="h-6 w-6 text-slate-600" />
            </div>
          </div>

          <p class="mt-3 truncate text-xs text-slate-400">
            {{ stats.availableFormations }} disponibles · {{ stats.totalParticipants }} participants
          </p>
        </div>


        <!-- Participation moyenne -->
        <!-- <div class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-slate-500">Participation moyenne</p>
              <p class="mt-1 text-3xl font-bold text-slate-900">
                {{ stats.avgParticipationRate }}%
              </p>
            </div>

            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <TrendingUp class="h-6 w-6 text-amber-600" />
            </div>
          </div>

          <p class="mt-3 truncate text-xs text-slate-400">
            {{ stats.departmentCount }} département(s) actifs
          </p>
        </div> -->

      </div>
    </div>

    <!-- SECTIONS -->
    <div class="grid gap-6 lg:grid-cols-2">

      <!-- ACTIVITÉ RÉCENTE -->
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Activity class="h-4 w-4 text-slate-400" />
          Activité récente
        </h2>
        <div class="space-y-1">
          <div
            v-for="(item, i) in recentActivities"
            :key="i"
            class="flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-slate-50"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="activityColor(item.type)">
              <component :is="activityIcon(item.type)" class="h-4 w-4 text-white" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-800">{{ item.action }}</p>
              <p class="text-xs text-slate-400">{{ item.user }}</p>
            </div>
            <span class="shrink-0 text-xs text-slate-400">{{ item.time }}</span>
          </div>
          <div v-if="recentActivities.length === 0" class="py-8 text-center text-sm text-slate-400">
            Aucune activité récente
          </div>
        </div>
      </div>

      <!-- STATUT SYSTÈME -->
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CheckCircle class="h-4 w-4 text-slate-400" />
          Statut système
        </h2>
        <div class="space-y-1">
          <div
            v-for="(item, i) in systemStatus"
            :key="i"
            class="flex items-center justify-between rounded-lg p-2.5 transition hover:bg-slate-50"
          >
            <div class="flex items-center gap-3">
              <div class="h-2 w-2 rounded-full" :class="item.ok ? 'bg-emerald-500' : 'bg-red-500'" />
              <span class="text-sm font-medium text-slate-700">{{ item.label }}</span>
            </div>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="item.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
            >{{ item.status }}</span>
          </div>
        </div>

        <!-- Répartition par rôle -->
        <div class="mt-5 border-t border-slate-100 pt-4">
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Répartition par rôle</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border border-slate-200 p-3 text-center">
              <p class="text-2xl font-bold text-slate-900">{{ stats.adminCount }}</p>
              <p class="text-xs text-slate-500">Admins</p>
            </div>
            <div class="rounded-lg border border-teal-100 bg-teal-50 p-3 text-center">
              <p class="text-2xl font-bold text-teal-700">{{ stats.grhCount }}</p>
              <p class="text-xs text-teal-600">GRH</p>
            </div>
            <div class="rounded-lg border border-slate-200 p-3 text-center">
              <p class="text-2xl font-bold text-slate-600">{{ stats.employeeCount }}</p>
              <p class="text-xs text-slate-500">Employés</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DÉPARTEMENTS -->
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Users class="h-4 w-4 text-slate-400" />
        Effectif par département
      </h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div
          v-for="dept in personnelStore.byDepartment.slice(0, 8)"
          :key="dept.dept"
          class="rounded-lg border border-slate-200 p-4 transition hover:border-teal-200 hover:bg-teal-50/30"
        >
          <p class="text-2xl font-bold text-slate-900">{{ dept.count }}</p>
          <p class="mt-0.5 truncate text-sm text-slate-500">{{ dept.dept }}</p>
        </div>
      </div>
    </div>

  </div>
</template>
