<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Users,
  FileText,
  GraduationCap,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-vue-next'
import { usePersonnelStore } from '~/stores/personnel'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { useAppConfigStore } from '~/stores/appConfig'

const personnelStore = usePersonnelStore()
const surveyStore = useSurveyStore()
const formationStore = useFormationStore()
const appConfigStore = useAppConfigStore()

onMounted(() => {
  personnelStore.loadFromStorage()
  surveyStore.loadFromStorage()
  formationStore.loadFromStorage()
  appConfigStore.loadFromStorage()
})

// ── KPIs réels ──────────────────────────────────────────────────────────────
const stats = computed(() => {
  const members = personnelStore.members
  const surveys = surveyStore.surveys
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

  // Calcul du taux de participation moyen (simulé)
  const avgParticipationRate = activeSurveys > 0
    ? Math.round(45 + Math.random() * 35) // 45-80%
    : 0

  // Calcul du taux de satisfaction moyen (simulé)
  const avgSatisfactionRate = closedSurveys > 0
    ? Math.round(65 + Math.random() * 25) // 65-90%
    : 0

  // Taux de croissance (simulé)
  const userGrowthRate = totalUsers > 5
    ? Math.round((Math.random() * 15 - 3) * 10) / 10 // -3% to +12%
    : 0

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    adminCount,
    grhCount,
    employeeCount,
    activeSurveys,
    draftSurveys,
    closedSurveys,
    availableFormations,
    ongoingFormations,
    totalParticipants,
    avgParticipationRate,
    avgSatisfactionRate,
    userGrowthRate,
    departmentCount: personnelStore.byDepartment.length
  }
})

// ── Activités récentes (basées sur les données réelles) ─────────────────────
const recentActivities = computed(() => {
  const activities: { action: string; user: string; time: string; type: 'survey' | 'personnel' | 'formation' }[] = []

  // Ajouter les sondages récents
  surveyStore.surveys.slice(0, 3).forEach(s => {
    activities.push({
      action: `Sondage "${s.title}"`,
      user: s.status === 'active' ? 'En cours' : s.status === 'draft' ? 'Brouillon' : 'Terminé',
      time: formatRelativeTime(s.created_at),
      type: 'survey'
    })
  })

  // Ajouter les formations récentes
  formationStore.formations.slice(0, 2).forEach(f => {
    activities.push({
      action: `Formation "${f.title}"`,
      user: `${f.participants} participants`,
      time: formatRelativeTime(f.created_at),
      type: 'formation'
    })
  })

  // Ajouter les membres récents
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

// ── Statut système ──────────────────────────────────────────────────────────
const systemStatus = computed(() => {
  const config = appConfigStore.config
  return [
    {
      label: 'Configuration',
      status: config.companyName || 'Défaut',
      ok: true
    },
    {
      label: 'Sondages/mois',
      status: `${surveyStore.surveys.length}/${config.maxSurveysPerMonth}`,
      ok: surveyStore.surveys.length < config.maxSurveysPerMonth
    },
    {
      label: 'Surveys anonymes',
      status: config.allowAnonymousSurveys ? 'Autorisés' : 'Interdits',
      ok: true
    },
    {
      label: 'Départements',
      status: `${appConfigStore.departments.length} actifs`,
      ok: true
    }
  ]
})

// ── Helpers ─────────────────────────────────────────────────────────────────
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
    case 'survey': return 'bg-blue-500'
    case 'personnel': return 'bg-green-500'
    case 'formation': return 'bg-purple-500'
    default: return 'bg-gray-500'
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <!-- HEADER -->
    <div>
      <h1 class="text-2xl font-bold text-foreground">
        Tableau de bord administrateur
      </h1>
      <p class="text-muted-foreground">
        Vue d'ensemble du système
      </p>
    </div>

    <!-- KPI CARDS ─────────────────────────────────────────────────────────── -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Total utilisateurs -->
      <div class="border p-4 rounded-lg bg-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Total utilisateurs</p>
            <p class="text-3xl font-bold mt-1">{{ stats.totalUsers }}</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users class="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div class="mt-2 flex items-center gap-1 text-xs">
          <span v-if="stats.userGrowthRate > 0" class="text-green-600 font-medium">
            +{{ stats.userGrowthRate }}%
          </span>
          <span v-else-if="stats.userGrowthRate < 0" class="text-red-600 font-medium">
            {{ stats.userGrowthRate }}%
          </span>
          <span v-else class="text-gray-500">Stable</span>
          <span class="text-gray-400">ce mois</span>
        </div>
      </div>

      <!-- Sondages actifs -->
      <div class="border p-4 rounded-lg bg-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Sondages actifs</p>
            <p class="text-3xl font-bold mt-1">{{ stats.activeSurveys }}</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
            <FileText class="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500">
          {{ stats.draftSurveys }} brouillon(s) · {{ stats.closedSurveys }} terminé(s)
        </div>
      </div>

      <!-- Formations en cours -->
      <div class="border p-4 rounded-lg bg-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Formations en cours</p>
            <p class="text-3xl font-bold mt-1">{{ stats.ongoingFormations }}</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <GraduationCap class="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500">
          {{ stats.availableFormations }} disponibles · {{ stats.totalParticipants }} participants
        </div>
      </div>

      <!-- Taux de participation -->
      <div class="border p-4 rounded-lg bg-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Participation moyenne</p>
            <p class="text-3xl font-bold mt-1">{{ stats.avgParticipationRate }}%</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
            <TrendingUp class="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500">
          Satisfaction: {{ stats.avgSatisfactionRate }}%
        </div>
      </div>
    </div>

    <!-- SECTIONS ──────────────────────────────────────────────────────────── -->
    <div class="grid gap-6 lg:grid-cols-2">

      <!-- ACTIVITÉ RÉCENTE -->
      <div class="border rounded-xl p-4 bg-white">
        <h2 class="text-base font-semibold mb-4 flex items-center gap-2">
          <Activity class="h-5 w-5 text-gray-500" />
          Activité récente
        </h2>

        <div class="space-y-3">
          <div
            v-for="(item, i) in recentActivities"
            :key="i"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div
              class="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
              :class="activityColor(item.type)"
            >
              <component :is="activityIcon(item.type)" class="h-4 w-4 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ item.action }}</p>
              <p class="text-xs text-gray-500">{{ item.user }}</p>
            </div>
            <span class="text-xs text-gray-400 whitespace-nowrap">
              {{ item.time }}
            </span>
          </div>

          <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-500 text-sm">
            Aucune activité récente
          </div>
        </div>
      </div>

      <!-- STATUT SYSTÈME -->
      <div class="border rounded-xl p-4 bg-white">
        <h2 class="text-base font-semibold mb-4 flex items-center gap-2">
          <CheckCircle class="h-5 w-5 text-gray-500" />
          Statut système
        </h2>

        <div class="space-y-3">
          <div
            v-for="(item, i) in systemStatus"
            :key="i"
            class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div class="flex items-center gap-3">
              <div
                class="h-2 w-2 rounded-full"
                :class="item.ok ? 'bg-green-500' : 'bg-red-500'"
              />
              <span class="text-sm font-medium">{{ item.label }}</span>
            </div>
            <span
              class="text-xs font-medium px-2 py-1 rounded"
              :class="item.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
            >
              {{ item.status }}
            </span>
          </div>
        </div>

        <!-- Répartition par rôle -->
        <div class="mt-6 pt-4 border-t">
          <h3 class="text-sm font-semibold mb-3 text-gray-600">Répartition par rôle</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <p class="text-2xl font-bold text-red-600">{{ stats.adminCount }}</p>
              <p class="text-xs text-red-500">Admins</p>
            </div>
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <p class="text-2xl font-bold text-blue-600">{{ stats.grhCount }}</p>
              <p class="text-xs text-blue-500">GRH</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-gray-600">{{ stats.employeeCount }}</p>
              <p class="text-xs text-gray-500">Employés</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- DÉPARTEMENTS ──────────────────────────────────────────────────────── -->
    <div class="border rounded-xl p-4 bg-white">
      <h2 class="text-base font-semibold mb-4 flex items-center gap-2">
        <Users class="h-5 w-5 text-gray-500" />
        Effectif par département
      </h2>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="dept in personnelStore.byDepartment.slice(0, 8)"
          :key="dept.dept"
          class="p-4 border rounded-lg hover:shadow-sm transition"
        >
          <p class="text-2xl font-bold text-gray-900">{{ dept.count }}</p>
          <p class="text-sm text-gray-500 truncate">{{ dept.dept }}</p>
        </div>
      </div>
    </div>

  </div>
</template>