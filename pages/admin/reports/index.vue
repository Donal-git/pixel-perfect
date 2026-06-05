<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  FileText,
  GraduationCap,
  TrendingUp,
  Users,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2
} from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { usePersonnelStore } from '~/stores/personnel'
import { useToast } from '~/composables/useToast'

const surveyStore = useSurveyStore()
const formationStore = useFormationStore()
const personnelStore = usePersonnelStore()
const toast = useToast()

onMounted(async () => {
  await Promise.all([
    surveyStore.loadFromStorage(),
    formationStore.loadFromStorage(),
    personnelStore.loadFromStorage()
  ])
})

// ── Synthèse Sondages ──────────────────────────────────────────────────────
const surveyStats = computed(() => {
  const surveys = surveyStore.surveys
  const active = surveys.filter(s => s.status === 'active')
  const draft = surveys.filter(s => s.status === 'draft')
  const closed = surveys.filter(s => s.status === 'closed')

  // Simulation des taux de réponse
  const totalResponses = active.length * 12 + closed.length * 25
  const avgResponseRate = active.length > 0
    ? Math.round(45 + Math.random() * 40)
    : 0

  // Département le plus actif
  const deptActivity = personnelStore.byDepartment.slice(0, 3)

  return {
    total: surveys.length,
    active: active.length,
    draft: draft.length,
    closed: closed.length,
    totalResponses,
    avgResponseRate,
    topDepartments: deptActivity
  }
})

// ── Synthèse Formations ────────────────────────────────────────────────────
const formationStats = computed(() => {
  const formations = formationStore.formations
  const disponible = formations.filter(f => f.status === 'disponible')
  const enCours = formations.filter(f => f.status === 'en_cours')
  const terminee = formations.filter(f => f.status === 'terminée')

  const totalParticipants = formations.reduce((sum, f) => sum + f.participants, 0)
  const avgCompletionRate = terminee.length > 0
    ? Math.round(70 + Math.random() * 25)
    : 0

  // Catégories les plus populaires
  const categories: Record<string, number> = {}
  formations.forEach(f => {
    categories[f.category] = (categories[f.category] || 0) + f.participants
  })
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return {
    total: formations.length,
    disponible: disponible.length,
    enCours: enCours.length,
    terminee: terminee.length,
    totalParticipants,
    avgCompletionRate,
    topCategories
  }
})

// ── KPIs globales ──────────────────────────────────────────────────────────
const globalKPIs = computed(() => {
  const totalEmployees = personnelStore.members.filter(m => m.status === 'actif').length
  const surveyParticipation = surveyStats.value.avgResponseRate
  const formationCompletion = formationStats.value.avgCompletionRate

  // Score global d'engagement (0-100)
  const engagementScore = Math.round(
    (surveyParticipation * 0.4 + formationCompletion * 0.3 + Math.min(100, totalEmployees / 2) * 0.3)
  )

  return {
    totalEmployees,
    surveyParticipation,
    formationCompletion,
    engagementScore
  }
})

// ── Activités récentes ─────────────────────────────────────────────────────
const recentActivities = computed(() => {
  const activities: { type: 'survey' | 'formation'; title: string; status: string; date: string }[] = []

  surveyStore.surveys.slice(0, 3).forEach(s => {
    activities.push({
      type: 'survey',
      title: s.title,
      status: s.status === 'active' ? 'En cours' : s.status === 'draft' ? 'Brouillon' : 'Terminé',
      date: new Date(s.created_at).toLocaleDateString('fr-FR')
    })
  })

  formationStore.formations.slice(0, 3).forEach(f => {
    activities.push({
      type: 'formation',
      title: f.title,
      status: f.status === 'disponible' ? 'Disponible' : f.status === 'en_cours' ? 'En cours' : 'Terminée',
      date: new Date(f.created_at).toLocaleDateString('fr-FR')
    })
  })

  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
})

// ── Export ──────────────────────────────────────────────────────────────────
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const buildReportSummary = () => {
  return [
    ['Statistique', 'Valeur'],
    ['Employés actifs', globalKPIs.value.totalEmployees],
    ['Participation sondages', `${globalKPIs.value.surveyParticipation}%`],
    ['Taux de complétion formations', `${globalKPIs.value.formationCompletion}%`],
    ['Score d’engagement', `${globalKPIs.value.engagementScore}/100`],
    ['Total sondages', surveyStats.value.total],
    ['Sondages actifs', surveyStats.value.active],
    ['Sondages brouillons', surveyStats.value.draft],
    ['Sondages terminés', surveyStats.value.closed],
    ['Total formations', formationStats.value.total],
    ['Formations disponibles', formationStats.value.disponible],
    ['Formations en cours', formationStats.value.enCours],
    ['Formations terminées', formationStats.value.terminee]
  ]
}

const exportExcelReport = async () => {
  if (!import.meta.client) return
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet(buildReportSummary())
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé')

  const surveyData = surveyStore.surveys.map(s => ({
    Titre: s.title,
    Statut: s.status === 'active' ? 'En cours' : s.status === 'draft' ? 'Brouillon' : 'Terminé',
    CrééLe: formatDate(s.created_at)
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(surveyData), 'Sondages')

  const formationData = formationStore.formations.map(f => ({
    Titre: f.title,
    Catégorie: f.category,
    Statut: f.status === 'disponible' ? 'Disponible' : f.status === 'en_cours' ? 'En cours' : 'Terminée',
    Participants: f.participants,
    CrééLe: formatDate(f.created_at)
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(formationData), 'Formations')

  const activityData = recentActivities.value.map(a => ({
    Type: a.type === 'survey' ? 'Sondage' : 'Formation',
    Titre: a.title,
    Statut: a.status,
    Date: a.date
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityData), 'Activités')

  const excelArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `rapport-${new Date().toISOString().slice(0, 10)}.xlsx`
  downloadBlob(blob, filename)
}

const exportPdfReport = async () => {
  if (!import.meta.client) return
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 40
  const lineHeight = 18

  doc.setFontSize(18)
  doc.text('Rapport RH', 40, y)
  y += 30

  doc.setFontSize(12)
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 40, y)
  y += 24

  doc.setFontSize(14)
  doc.text('Indicateurs clés', 40, y)
  y += 20

  const summaryRows = buildReportSummary().slice(1)
  summaryRows.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`, 40, y)
    y += lineHeight
    if (y > 760) {
      doc.addPage()
      y = 40
    }
  })

  y += 10
  doc.setFontSize(14)
  doc.text('Sondages', 40, y)
  y += 20
  surveyStore.surveys.slice(0, 5).forEach(s => {
    doc.setFontSize(12)
    doc.text(`• ${s.title} — ${s.status === 'active' ? 'En cours' : s.status === 'draft' ? 'Brouillon' : 'Terminé'} (${formatDate(s.created_at)})`, 40, y)
    y += lineHeight
    if (y > 760) {
      doc.addPage()
      y = 40
    }
  })

  y += 10
  doc.setFontSize(14)
  doc.text('Formations', 40, y)
  y += 20
  formationStore.formations.slice(0, 5).forEach(f => {
    doc.setFontSize(12)
    doc.text(`• ${f.title} — ${f.category} — ${f.participants} participants`, 40, y)
    y += lineHeight
    if (y > 760) {
      doc.addPage()
      y = 40
    }
  })

  y += 10
  doc.setFontSize(14)
  doc.text('Activités récentes', 40, y)
  y += 20
  recentActivities.value.forEach(a => {
    doc.setFontSize(12)
    doc.text(`• ${a.type === 'survey' ? 'Sondage' : 'Formation'}: ${a.title} — ${a.status} — ${a.date}`, 40, y)
    y += lineHeight
    if (y > 760) {
      doc.addPage()
      y = 40
    }
  })

  doc.save(`rapport-${new Date().toISOString().slice(0, 10)}.pdf`)
}

const exportReport = async (type: 'pdf' | 'excel') => {
  toast.success('Export en cours', `Génération du rapport ${type.toUpperCase()}...`)
  try {
    if (type === 'excel') {
      await exportExcelReport()
    } else {
      await exportPdfReport()
    }
    toast.success('Export terminé', `Le rapport ${type.toUpperCase()} a été téléchargé.`)
  } catch (error) {
    console.error('Erreur export rapport:', error)
    toast.error('Erreur export', 'Impossible de générer le rapport. Veuillez réessayer.')
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const statusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'disponible':
    case 'En cours':
      return 'bg-green-100 text-green-700'
    case 'draft':
    case 'Brouillon':
      return 'bg-yellow-100 text-yellow-700'
    case 'closed':
    case 'terminée':
    case 'Terminé':
    case 'Terminée':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER ──────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Rapports & Statistiques</h1>
        <p class="mt-1 text-sm text-gray-500">Synthèse des sondages et formations</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="exportReport('excel')"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <Download class="h-4 w-4" />
          Export Excel
        </button>
        <button
          @click="exportReport('pdf')"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          <Download class="h-4 w-4" />
          Export PDF
        </button>
      </div>
    </div>

    <!-- KPIs GLOBALES ───────────────────────────────────────────────────── -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Employés actifs</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{{ globalKPIs.totalEmployees }}</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users class="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Participation sondages</p>
            <p class="text-3xl font-bold text-green-600 mt-1">{{ globalKPIs.surveyParticipation }}%</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp class="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div class="mt-2 flex items-center gap-1 text-xs">
          <ArrowUpRight class="h-3 w-3 text-green-500" />
          <span class="text-green-600 font-medium">+5%</span>
          <span class="text-gray-400">vs mois dernier</span>
        </div>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Taux de complétion</p>
            <p class="text-3xl font-bold text-purple-600 mt-1">{{ globalKPIs.formationCompletion }}%</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <GraduationCap class="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div class="mt-2 flex items-center gap-1 text-xs">
          <ArrowUpRight class="h-3 w-3 text-green-500" />
          <span class="text-green-600 font-medium">+8%</span>
          <span class="text-gray-400">vs mois dernier</span>
        </div>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Score d'engagement</p>
            <p class="text-3xl font-bold text-amber-600 mt-1">{{ globalKPIs.engagementScore }}/100</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
            <CheckCircle2 class="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-400">
          {{ globalKPIs.engagementScore >= 70 ? 'Excellent' : globalKPIs.engagementScore >= 50 ? 'Bon' : 'À améliorer' }}
        </div>
      </div>
    </div>

    <!-- SYNTHÈSE SONDAges ───────────────────────────────────────────────── -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FileText class="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900">Synthèse des Sondages</h2>
              <p class="text-xs text-gray-500">{{ surveyStats.total }} sondages au total</p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- Stats rapides -->
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <p class="text-2xl font-bold text-green-600">{{ surveyStats.active }}</p>
              <p class="text-xs text-green-500 mt-1">En cours</p>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <p class="text-2xl font-bold text-yellow-600">{{ surveyStats.draft }}</p>
              <p class="text-xs text-yellow-500 mt-1">Brouillons</p>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-gray-600">{{ surveyStats.closed }}</p>
              <p class="text-xs text-gray-500 mt-1">Terminés</p>
            </div>
          </div>

          <!-- Réponses -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 border rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <Clock class="h-4 w-4 text-gray-400" />
                <span class="text-sm text-gray-500">Total réponses</span>
              </div>
              <p class="text-3xl font-bold text-gray-900">{{ surveyStats.totalResponses }}</p>
            </div>
            <div class="p-4 border rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <TrendingUp class="h-4 w-4 text-gray-400" />
                <span class="text-sm text-gray-500">Taux de réponse moyen</span>
              </div>
              <p class="text-3xl font-bold text-green-600">{{ surveyStats.avgResponseRate }}%</p>
            </div>
          </div>

          <!-- Top départements -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Départements les plus actifs</h3>
            <div class="space-y-2">
              <div
                v-for="(dept, i) in surveyStats.topDepartments"
                :key="dept.dept"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    {{ i + 1 }}
                  </span>
                  <span class="text-sm font-medium text-gray-900">{{ dept.dept }}</span>
                </div>
                <span class="text-sm font-bold text-gray-900">{{ dept.count }} membres</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste sondages récents -->
      <div class="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold text-gray-900">Sondages récents</h2>
        </div>
        <div class="divide-y">
          <div
            v-for="survey in surveyStore.surveys.slice(0, 5)"
            :key="survey.id"
            class="p-4 hover:bg-gray-50 transition"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ survey.title }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ formatDate(survey.created_at) }}</p>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="statusColor(survey.status)"
              >
                {{ survey.status === 'active' ? 'En cours' : survey.status === 'draft' ? 'Brouillon' : 'Terminé' }}
              </span>
            </div>
          </div>
          <div v-if="surveyStore.surveys.length === 0" class="p-8 text-center text-gray-500 text-sm">
            Aucun sondage pour le moment
          </div>
        </div>
      </div>
    </div>

    <!-- SYNTHÈSE FORMATIONS ─────────────────────────────────────────────── -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Liste formations récentes -->
      <div class="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold text-gray-900">Formations récentes</h2>
        </div>
        <div class="divide-y">
          <div
            v-for="formation in formationStore.formations.slice(0, 5)"
            :key="formation.id"
            class="p-4 hover:bg-gray-50 transition"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ formation.title }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ formation.category }} · {{ formation.participants }} participants</p>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="statusColor(formation.status)"
              >
                {{ formation.status === 'disponible' ? 'Dispo' : formation.status === 'en_cours' ? 'En cours' : 'Terminée' }}
              </span>
            </div>
          </div>
          <div v-if="formationStore.formations.length === 0" class="p-8 text-center text-gray-500 text-sm">
            Aucune formation pour le moment
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <GraduationCap class="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900">Synthèse des Formations</h2>
              <p class="text-xs text-gray-500">{{ formationStats.total }} formations au total</p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- Stats rapides -->
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <p class="text-2xl font-bold text-green-600">{{ formationStats.disponible }}</p>
              <p class="text-xs text-green-500 mt-1">Disponibles</p>
            </div>
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <p class="text-2xl font-bold text-blue-600">{{ formationStats.enCours }}</p>
              <p class="text-xs text-blue-500 mt-1">En cours</p>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-gray-600">{{ formationStats.terminee }}</p>
              <p class="text-xs text-gray-500 mt-1">Terminées</p>
            </div>
          </div>

          <!-- Participants & complétion -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 border rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <Users class="h-4 w-4 text-gray-400" />
                <span class="text-sm text-gray-500">Total participants</span>
              </div>
              <p class="text-3xl font-bold text-gray-900">{{ formationStats.totalParticipants }}</p>
            </div>
            <div class="p-4 border rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <CheckCircle2 class="h-4 w-4 text-gray-400" />
                <span class="text-sm text-gray-500">Taux de complétion</span>
              </div>
              <p class="text-3xl font-bold text-purple-600">{{ formationStats.avgCompletionRate }}%</p>
            </div>
          </div>

          <!-- Top catégories -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Catégories les plus populaires</h3>
            <div class="space-y-2">
              <div
                v-for="(cat, i) in formationStats.topCategories"
                :key="cat[0]"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
                    {{ i + 1 }}
                  </span>
                  <span class="text-sm font-medium text-gray-900">{{ cat[0] }}</span>
                </div>
                <span class="text-sm font-bold text-gray-900">{{ cat[1] }} participants</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ACTIVITÉS RÉCENTES ──────────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div class="border-b px-6 py-4">
        <h2 class="font-semibold text-gray-900">Activités récentes</h2>
      </div>
      <div class="divide-y">
        <div
          v-for="(activity, i) in recentActivities"
          :key="i"
          class="flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div class="flex items-center gap-4">
            <div
              class="h-10 w-10 rounded-lg flex items-center justify-center"
              :class="activity.type === 'survey' ? 'bg-green-100' : 'bg-purple-100'"
            >
              <component
                :is="activity.type === 'survey' ? FileText : GraduationCap"
                class="h-5 w-5"
                :class="activity.type === 'survey' ? 'text-green-600' : 'text-purple-600'"
              />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ activity.title }}</p>
              <p class="text-xs text-gray-500">{{ activity.status }}</p>
            </div>
          </div>
          <span class="text-xs text-gray-400">{{ activity.date }}</span>
        </div>
        <div v-if="recentActivities.length === 0" class="p-8 text-center text-gray-500 text-sm">
          Aucune activité récente
        </div>
      </div>
    </div>

  </div>
</template>