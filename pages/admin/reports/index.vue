<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  FileText,
  GraduationCap,
  TrendingUp,
  Users,
  Download,
  Clock,
  CheckCircle2,
  BarChart3
} from 'lucide-vue-next'
import { useSurveyStore } from '~/stores/survey'
import { useFormationStore } from '~/stores/formation'
import { usePersonnelStore } from '~/stores/personnel'
import { useToast } from '~/composables/useToast'

const surveyStore = useSurveyStore()
const formationStore = useFormationStore()
const personnelStore = usePersonnelStore()
const toast = useToast()

const surveyResponseCounts = ref<Record<string, number>>({})
const loadingResponses = ref(false)

onMounted(async () => {
  await Promise.all([
    surveyStore.loadFromStorage(),
    surveyStore.loadAllResponses({ status: 'submitted' }),
    formationStore.loadFromStorage(),
    personnelStore.loadFromStorage()
  ])
  loadingResponses.value = true
  try {
    const surveysToFetch = surveyStore.surveys.filter(s => s.status !== 'draft')
    const results = await Promise.allSettled(
      surveysToFetch.map(s => surveyStore.getSurveyResponses(s.id))
    )
    const counts: Record<string, number> = {}
    surveysToFetch.forEach((survey, i) => {
      const result = results[i]
      counts[survey.id] = result.status === 'fulfilled'
        ? result.value.filter((r: any) => r.status === 'submitted').length
        : 0
    })
    surveyResponseCounts.value = counts
  } catch (e) {
    console.error('Erreur chargement réponses:', e)
  } finally {
    loadingResponses.value = false
  }
})

// ── Synthèse Sondages ──────────────────────────────────────────────────────
const surveyStats = computed(() => {
  const surveys = surveyStore.surveys
  const active = surveys.filter(s => s.status === 'active')
  const draft = surveys.filter(s => s.status === 'draft')
  const closed = surveys.filter(s => s.status === 'closed')

  const totalResponses = Object.values(surveyResponseCounts.value).reduce((sum, n) => sum + n, 0)
  const surveysWithResponses = surveys.filter(s => (surveyResponseCounts.value[s.id] || 0) > 0).length

  const deptActivity = personnelStore.byDepartment.slice(0, 3)

  return {
    total: surveys.length,
    active: active.length,
    draft: draft.length,
    closed: closed.length,
    totalResponses,
    surveysWithResponses,
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
  const avgCompletionRate = formations.length > 0
    ? Math.round((terminee.length / formations.length) * 100)
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
  const totalResponses = surveyStats.value.totalResponses
  const totalParticipants = formationStats.value.totalParticipants
  const formationCompletion = formationStats.value.avgCompletionRate

  return {
    totalEmployees,
    totalResponses,
    totalParticipants,
    formationCompletion
  }
})

// ── Réponses sondages par département ─────────────────────────────────────
const responsesByDepartment = computed(() => {
  const map: Record<string, number> = {}
  for (const resp of surveyStore.responses) {
    const member = personnelStore.members.find(m => m.id === resp.employee_id)
    const dept = member?.department || 'Non assigné'
    map[dept] = (map[dept] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
})

// ── Formations par département ─────────────────────────────────────────────
const formationsByDepartment = computed(() => {
  const map: Record<string, number> = {}
  for (const f of formationStore.formations) {
    for (const dept of (f.departments ?? [])) {
      map[dept] = (map[dept] ?? 0) + f.participants
    }
  }
  return Object.entries(map)
    .map(([dept, participants]) => ({ dept, participants }))
    .sort((a, b) => b.participants - a.participants)
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

// const buildReportSummary = () => {
//   return [
//     ['Statistique', 'Valeur'],
//     [‘Employés actifs’, globalKPIs.value.totalEmployees],
//     [‘Réponses soumises (sondages)’, globalKPIs.value.totalResponses],
//     [‘Formations terminées’, `${globalKPIs.value.formationCompletion}%`],
//     [‘Total participants formations’, globalKPIs.value.totalParticipants],
//     ['Total sondages', surveyStats.value.total],
//     ['Sondages actifs', surveyStats.value.active],
//     ['Sondages brouillons', surveyStats.value.draft],
//     ['Sondages terminés', surveyStats.value.closed],
//     ['Total formations', formationStats.value.total],
//     ['Formations disponibles', formationStats.value.disponible],
//     ['Formations en cours', formationStats.value.enCours],
//     ['Formations terminées', formationStats.value.terminee]
//   ]
// }


const buildReportSummary = () => {
  return [
    ['Statistique', 'Valeur'],
    ['Employés actifs', globalKPIs.value.totalEmployees],
    ['Réponses soumises (sondages)', globalKPIs.value.totalResponses],
    ['Formations terminées', `${globalKPIs.value.formationCompletion}%`],
    ['Total participants formations', globalKPIs.value.totalParticipants],
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

  const deptSurveyData = responsesByDepartment.value.map((item, i) => ({
    Rang: i + 1,
    Département: item.dept,
    'Réponses sondages': item.count
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(deptSurveyData.length ? deptSurveyData : [{ Info: 'Aucune réponse' }]), 'Réponses par dép.')

  const deptFormationData = formationsByDepartment.value.map((item, i) => ({
    Rang: i + 1,
    Département: item.dept,
    'Participants formations': item.participants
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(deptFormationData.length ? deptFormationData : [{ Info: 'Aucune donnée' }]), 'Formations par dép.')

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
  doc.text('Réponses par département', 40, y)
  y += 20
  if (responsesByDepartment.value.length === 0) {
    doc.setFontSize(12)
    doc.text('Aucune réponse enregistrée', 40, y)
    y += lineHeight
  } else {
    responsesByDepartment.value.forEach(item => {
      doc.setFontSize(12)
      doc.text(`• ${item.dept} : ${item.count} réponse(s)`, 40, y)
      y += lineHeight
      if (y > 760) { doc.addPage(); y = 40 }
    })
  }

  y += 10
  doc.setFontSize(14)
  doc.text('Formations par département', 40, y)
  y += 20
  if (formationsByDepartment.value.length === 0) {
    doc.setFontSize(12)
    doc.text('Aucune formation assignée à un département', 40, y)
    y += lineHeight
  } else {
    formationsByDepartment.value.forEach(item => {
      doc.setFontSize(12)
      doc.text(`• ${item.dept} : ${item.participants} participant(s)`, 40, y)
      y += lineHeight
      if (y > 760) { doc.addPage(); y = 40 }
    })
  }

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
            <p class="text-sm text-gray-500">Réponses soumises</p>
            <p class="text-3xl font-bold text-green-600 mt-1">
              <span v-if="loadingResponses" class="text-lg text-gray-400">…</span>
              <span v-else>{{ globalKPIs.totalResponses }}</span>
            </p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp class="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-400">
          {{ surveyStats.surveysWithResponses }} sondage(s) avec réponses
        </div>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Formations terminées</p>
            <p class="text-3xl font-bold text-purple-600 mt-1">{{ globalKPIs.formationCompletion }}%</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <GraduationCap class="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-400">
          {{ formationStats.terminee }} / {{ formationStats.total }} formations
        </div>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Participants formations</p>
            <p class="text-3xl font-bold text-amber-600 mt-1">{{ globalKPIs.totalParticipants }}</p>
          </div>
          <div class="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
            <CheckCircle2 class="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-400">
          Toutes formations confondues
        </div>
      </div>
    </div>

    <!-- SYNTHÈSE SONDAGES ───────────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white shadow-sm overflow-hidden">
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
                <BarChart3 class="h-4 w-4 text-gray-400" />
                <span class="text-sm text-gray-500">Sondages avec réponses</span>
              </div>
              <p class="text-3xl font-bold text-green-600">
                <span v-if="loadingResponses" class="text-lg text-gray-400">…</span>
                <span v-else>{{ surveyStats.surveysWithResponses }}</span>
              </p>
              <p v-if="!loadingResponses" class="text-xs text-gray-400 mt-1">
                sur {{ surveyStats.total }} sondage(s)
              </p>
            </div>
          </div>

          <!-- Réponses par département -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Réponses par département</h3>
            <div v-if="responsesByDepartment.length === 0" class="text-xs text-gray-400 py-2">
              Aucune réponse enregistrée
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(item, i) in responsesByDepartment"
                :key="item.dept"
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                  {{ i + 1 }}
                </span>
                <span class="flex-1 text-sm font-medium text-gray-900 truncate">{{ item.dept }}</span>
                <div class="flex-1 overflow-hidden rounded-full bg-gray-200 mx-2" style="height:10px;">
                  <div
                    class="h-full rounded-full bg-blue-500 transition-all duration-700"
                    :style="{ width: (responsesByDepartment[0]?.count ? Math.round((item.count / responsesByDepartment[0].count) * 100) : 0) + '%' }"
                  />
                </div>
                <span class="shrink-0 text-sm font-bold text-gray-900">{{ item.count }} rép.</span>
              </div>
            </div>
          </div>
        </div>
      </div>


    <!-- LISTE COMPLÈTE DES SONDAGES ──────────────────────────────────────── -->
    <div class="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div class="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 class="font-semibold text-gray-900">Tous les sondages</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            Cliquez sur "Résultats" pour accéder aux statistiques détaillées de chaque sondage
          </p>
        </div>
        <span v-if="loadingResponses" class="text-xs text-gray-400 animate-pulse">Chargement des réponses…</span>
      </div>

      <div v-if="surveyStore.surveys.filter(s => s.status !== 'draft').length === 0" class="flex flex-col items-center justify-center py-14 text-center">
        <FileText class="h-10 w-10 text-gray-200" />
        <p class="mt-3 text-sm text-gray-500">Aucun sondage publié pour le moment</p>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="survey in surveyStore.surveys.filter(s => s.status !== 'draft')"
          :key="survey.id"
          class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition"
        >
          <!-- Infos -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ survey.title }}</p>
            <p class="mt-0.5 text-xs text-gray-400">Créé le {{ formatDate(survey.created_at) }}</p>
          </div>

          <!-- Réponses réelles -->
          <div class="shrink-0 text-right w-20">
            <p v-if="loadingResponses" class="text-base font-bold text-gray-300">…</p>
            <p v-else class="text-base font-bold text-gray-900">{{ surveyResponseCounts[survey.id] ?? 0 }}</p>
            <p class="text-xs text-gray-400">réponse(s)</p>
          </div>

          <!-- Statut + lien résultats -->
          <div class="shrink-0 flex items-center gap-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="statusColor(survey.status)"
            >
              {{ survey.status === 'active' ? 'En cours' : 'Terminé' }}
            </span>
            <NuxtLink
              :to="`/grh/surveys/${survey.id}/stats`"
              class="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-purple-700"
            >
              <BarChart3 class="h-3.5 w-3.5" />
              Résultats
            </NuxtLink>
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

          <!-- Formations par département -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Participants par département</h3>
            <div v-if="formationsByDepartment.length === 0" class="text-xs text-gray-400 py-2">
              Aucune formation assignée à un département
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(item, i) in formationsByDepartment.slice(0, 5)"
                :key="item.dept"
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
                  {{ i + 1 }}
                </span>
                <span class="flex-1 text-sm font-medium text-gray-900 truncate">{{ item.dept }}</span>
                <span class="shrink-0 text-sm font-bold text-gray-900">{{ item.participants }} participants</span>
              </div>
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