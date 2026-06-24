<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Pencil, Trash2, X, GraduationCap, Clock, Users, BookOpen,
  Search, CheckCircle2, PlayCircle, Archive, FileText, Send, Calendar,
  Building2, Save, LayoutList, LayoutGrid, ChevronDown, UserCheck
} from 'lucide-vue-next'
import { useFormationStore, type Formation } from '~/stores/formation'
import { usePersonnelStore } from '~/stores/personnel'
import { useToast } from '~/composables/useToast'

const formationStore = useFormationStore()
const personnelStore = usePersonnelStore()
const toast = useToast()

const DEPARTMENTS = ['RH', 'Finance', 'IT', 'Commercial', 'Production', 'Marketing', 'Direction', 'Logistique']
const ALL_DEPTS   = 'Tous les départements'
const CATEGORIES  = ['Informatique', 'Management', 'Soft Skills', 'Technique', 'Sécurité', 'Juridique', 'Finance', 'Autre']

// ── State ────────────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const filterCategory = ref('all')
const filterStatus   = ref('all')
const viewMode = ref<'list' | 'grid'>('list')

const showFormModal       = ref(false)
const editingFormationId  = ref<string | null>(null)
const formLoading         = ref(false)
const publishingId        = ref<string | null>(null)

const showDeleteModal      = ref(false)
const deletingFormationId  = ref<string | null>(null)

// ── Formulaire ───────────────────────────────────────────────────────────────
const form = ref({
  title:       '',
  description: '',
  category:    'Informatique',
  duration:    '',
  level:       'débutant' as Formation['level'],
  status:      'brouillon' as Formation['status'],
  departments: [] as string[],
  participants: 0,
  start_date:  '',
  end_date:    ''
})

// Contexte brouillon = création OU édition d'un brouillon existant
const isBrouillonContext = computed(() => {
  if (!editingFormationId.value) return true
  const f = formationStore.getFormationById(editingFormationId.value)
  return !f || f.status === 'brouillon'
})

const isAllDepts = computed(() => form.value.departments.includes(ALL_DEPTS))

// ── Inscrits par formation ────────────────────────────────────────────────────
const openFormationId   = ref<string | null>(null)
const enrolledCache     = ref<Record<string, { name: string; department: string; position: string; status: string }[]>>({})
const loadingEnrollment = ref<Record<string, boolean>>({})

const toggleEnrollees = async (formationId: string) => {
  if (openFormationId.value === formationId) {
    openFormationId.value = null
    return
  }
  openFormationId.value = formationId
  if (enrolledCache.value[formationId]) return
  loadingEnrollment.value[formationId] = true
  try {
    const regs = await formationStore.getFormationRegistrations(formationId)
    enrolledCache.value[formationId] = regs.map(r => {
      const m = personnelStore.members.find(p => p.id === r.employee_id)
      return {
        name:       m?.name       ?? '—',
        department: m?.department ?? '—',
        position:   m?.position   ?? '—',
        status:     r.status
      }
    })
  } catch {
    enrolledCache.value[formationId] = []
  } finally {
    loadingEnrollment.value[formationId] = false
  }
}

const statusRegConfig: Record<string, { label: string; class: string }> = {
  inscrit:  { label: 'Inscrit',  class: 'bg-green-100 text-green-700' },
  en_cours: { label: 'En cours', class: 'bg-teal-100 text-teal-700'  },
  complété: { label: 'Complété', class: 'bg-gray-100 text-gray-500'  }
}

onMounted(async () => {
  await Promise.all([
    formationStore.loadFromStorage(),
    personnelStore.loadFromStorage()
  ])
})

// ── Filtres ──────────────────────────────────────────────────────────────────
const filteredFormations = computed(() =>
  formationStore.formations.filter(f => {
    const matchSearch   = f.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          f.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCategory = filterCategory.value === 'all' || f.category === filterCategory.value
    const matchStatus   = filterStatus.value === 'all' || f.status === filterStatus.value
    return matchSearch && matchCategory && matchStatus
  })
)

const stats = computed(() => ({
  total:      formationStore.formations.length,
  brouillons: formationStore.formations.filter(f => f.status === 'brouillon').length,
  available:  formationStore.formations.filter(f => f.status === 'disponible').length,
  ongoing:    formationStore.formations.filter(f => f.status === 'en_cours').length
}))

// ── Config UI ────────────────────────────────────────────────────────────────
const statusConfig: Record<Formation['status'], { label: string; class: string; icon: any }> = {
  brouillon:  { label: 'Brouillon',  class: 'bg-amber-100 text-amber-700',  icon: FileText   },
  disponible: { label: 'Disponible', class: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  en_cours:   { label: 'En cours',   class: 'bg-teal-50 text-teal-700',    icon: PlayCircle  },
  terminée:   { label: 'Terminée',   class: 'bg-gray-100 text-gray-500',    icon: Archive     }
}

const levelConfig: Record<Formation['level'], { label: string; class: string }> = {
  débutant:      { label: 'Débutant',       class: 'bg-emerald-50 text-emerald-700' },
  intermédiaire: { label: 'Intermédiaire',  class: 'bg-amber-50 text-amber-700'    },
  avancé:        { label: 'Avancé',         class: 'bg-red-50 text-red-700'        }
}


// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateRange = (f: Formation): string | null => {
  if (f.start_date && f.end_date) return `${formatDate(f.start_date)} → ${formatDate(f.end_date)}`
  if (f.start_date) return `Début : ${formatDate(f.start_date)}`
  return null
}

const deptLabel = (departments: string[]) =>
  departments.includes(ALL_DEPTS) ? 'tous les départements' : departments.join(', ')

// ── Modal ────────────────────────────────────────────────────────────────────
const openEditModal = (id: string) => {
  const f = formationStore.getFormationById(id)
  if (!f) return
  editingFormationId.value = id
  form.value = {
    title:        f.title,
    description:  f.description,
    category:     f.category,
    duration:     f.duration,
    level:        f.level,
    status:       f.status,
    departments:  [...f.departments],
    participants: f.participants,
    start_date:   f.start_date || '',
    end_date:     f.end_date   || ''
  }
  showFormModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
  editingFormationId.value = null
}

// ── Départements ─────────────────────────────────────────────────────────────
const toggleDepartment = (dept: string) => {
  form.value.departments = form.value.departments.filter(d => d !== ALL_DEPTS)
  const idx = form.value.departments.indexOf(dept)
  if (idx === -1) form.value.departments.push(dept)
  else form.value.departments.splice(idx, 1)
}

const toggleAllDepts = () => {
  form.value.departments = isAllDepts.value ? [] : [ALL_DEPTS]
}

// ── Validation ───────────────────────────────────────────────────────────────
const validateDraft = () => {
  if (!form.value.title.trim()) { toast.error('Le titre est obligatoire'); return false }
  return true
}

const validatePublish = () => {
  if (!form.value.title.trim())    { toast.error('Le titre est obligatoire'); return false }
  if (!form.value.duration.trim()) { toast.error('La durée est obligatoire'); return false }
  if (form.value.departments.length === 0) { toast.error('Sélectionnez au moins un département'); return false }
  if (form.value.start_date && form.value.end_date && form.value.end_date < form.value.start_date) {
    toast.error('La date de fin doit être postérieure à la date de début'); return false
  }
  return true
}

// ── Soumissions ──────────────────────────────────────────────────────────────
const handleSaveDraft = async () => {
  if (!validateDraft()) return
  formLoading.value = true
  try {
    const payload = { ...form.value, status: 'brouillon' as const }
    if (editingFormationId.value) {
      await formationStore.updateFormation(editingFormationId.value, payload)
      toast.success('Brouillon mis à jour')
    } else {
      await formationStore.createFormation(payload)
      toast.success('Brouillon enregistré', 'Non visible par les employés tant qu\'il n\'est pas envoyé')
    }
    closeFormModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Une erreur est survenue')
  } finally {
    formLoading.value = false
  }
}

const handlePublish = async () => {
  if (!validatePublish()) return
  formLoading.value = true
  try {
    const payload = { ...form.value, status: 'disponible' as const }
    if (editingFormationId.value) {
      await formationStore.updateFormation(editingFormationId.value, payload)
      toast.success('Formation envoyée', `Publication vers : ${deptLabel(form.value.departments)}`)
    } else {
      await formationStore.createFormation(payload)
      toast.success('Formation publiée et envoyée', `Département(s) notifié(s) : ${deptLabel(form.value.departments)}`)
    }
    closeFormModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Une erreur est survenue')
  } finally {
    formLoading.value = false
  }
}

const handleSave = async () => {
  if (!validatePublish()) return
  formLoading.value = true
  try {
    await formationStore.updateFormation(editingFormationId.value!, { ...form.value })
    toast.success('Formation mise à jour')
    closeFormModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Une erreur est survenue')
  } finally {
    formLoading.value = false
  }
}

// Publication directe depuis une carte brouillon
const handlePublishDirect = async (id: string) => {
  const f = formationStore.getFormationById(id)
  if (!f) return
  publishingId.value = id
  try {
    await formationStore.publishFormation(id)
    toast.success('Formation envoyée !', `Publiée vers : ${deptLabel(f.departments)}`)
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de publier cette formation')
  } finally {
    publishingId.value = null
  }
}

// ── Suppression ───────────────────────────────────────────────────────────────
const openDeleteModal = (id: string) => {
  deletingFormationId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (deletingFormationId.value) {
    try {
      await formationStore.deleteFormation(deletingFormationId.value)
      toast.success('Formation supprimée')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de supprimer cette formation')
    }
  }
  showDeleteModal.value = false
  deletingFormationId.value = null
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── HEADER ─────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Formations</h1>
        <p class="mt-1 text-sm text-gray-500">Gérez et diffusez les formations auprès des départements</p>
      </div>
      <NuxtLink
        to="/grh/formations/create"
        class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
      >
        <Plus class="h-4 w-4" />
        Nouvelle formation
      </NuxtLink>
    </div>

    <!-- ── STATS ──────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">Total</p>
        <p class="mt-1 text-3xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="mt-0.5 text-xs text-gray-400">formations</p>
      </div>
      <div class="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
        <p class="text-xs font-medium text-amber-600">Brouillons</p>
        <p class="mt-1 text-3xl font-bold text-amber-500">{{ stats.brouillons }}</p>
        <p class="mt-0.5 text-xs text-amber-400">non publiées</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">Disponibles</p>
        <p class="mt-1 text-3xl font-bold text-green-600">{{ stats.available }}</p>
        <p class="mt-0.5 text-xs text-gray-400">inscriptions ouvertes</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">En cours</p>
        <p class="mt-1 text-3xl font-bold text-teal-600">{{ stats.ongoing }}</p>
        <p class="mt-0.5 text-xs text-gray-400">sessions actives</p>
      </div>
    </div>

    <!-- ── FILTRES ────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher une formation..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>
      <select
        v-model="filterCategory"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
      >
        <option value="all">Toutes les catégories</option>
        <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select
        v-model="filterStatus"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
      >
        <option value="all">Tous les statuts</option>
        <option value="brouillon">Brouillon</option>
        <option value="disponible">Disponible</option>
        <option value="en_cours">En cours</option>
        <option value="terminée">Terminée</option>
      </select>
      <!-- Toggle vue liste / grille -->
      <div class="flex shrink-0 items-center rounded-lg border border-gray-200 bg-white p-1 gap-0.5">
        <button
          @click="viewMode = 'list'"
          :title="'Vue liste'"
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition"
          :class="viewMode === 'list' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        >
          <LayoutList class="h-4 w-4" />
          Liste
        </button>
        <button
          @click="viewMode = 'grid'"
          :title="'Vue grille'"
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition"
          :class="viewMode === 'grid' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        >
          <LayoutGrid class="h-4 w-4" />
          Grille
        </button>
      </div>
    </div>

    <!-- ── LISTE DES FORMATIONS ─────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white shadow-sm">
      <div class="border-b px-6 py-4">
        <h2 class="font-semibold text-gray-800">
          Toutes les formations
          <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {{ filteredFormations.length }}
          </span>
        </h2>
      </div>

      <!-- VIDE -->
      <div v-if="filteredFormations.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <GraduationCap class="h-8 w-8 text-gray-400" />
        </div>
        <p class="mt-4 text-sm font-medium text-gray-900">Aucune formation trouvée</p>
        <p class="mt-1 text-xs text-gray-500">Modifiez vos filtres ou créez une nouvelle formation.</p>
      </div>

      <!-- VUE LISTE -->
      <div v-else-if="viewMode === 'list'" class="divide-y">
        <div v-for="formation in filteredFormations" :key="formation.id">

          <!-- Ligne cliquable -->
          <div
            class="group flex items-center gap-4 px-6 py-4 transition hover:bg-gray-50 cursor-pointer"
            @click="toggleEnrollees(formation.id)"
          >
            <!-- Icône statut -->
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              :class="{
                'bg-amber-100': formation.status === 'brouillon',
                'bg-green-100': formation.status === 'disponible',
                'bg-teal-100':  formation.status === 'en_cours',
                'bg-gray-100':  formation.status === 'terminée'
              }"
            >
              <FileText     v-if="formation.status === 'brouillon'"   class="h-5 w-5 text-amber-600" />
              <CheckCircle2 v-else-if="formation.status === 'disponible'" class="h-5 w-5 text-green-600" />
              <PlayCircle   v-else-if="formation.status === 'en_cours'"   class="h-5 w-5 text-teal-600" />
              <Archive      v-else                                          class="h-5 w-5 text-gray-500" />
            </div>

            <!-- Infos -->
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-semibold text-gray-900">{{ formation.title }}</p>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="statusConfig[formation.status]?.class">{{ statusConfig[formation.status]?.label }}</span>
                <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ formation.category }}</span>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="levelConfig[formation.level]?.class">{{ levelConfig[formation.level]?.label }}</span>
              </div>
              <p class="mt-0.5 truncate text-xs text-gray-500">{{ formation.description || 'Aucune description' }}</p>
              <div class="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span class="flex items-center gap-1"><BookOpen class="h-3 w-3" />{{ formatDate(formation.created_at) }}</span>
                <span v-if="formation.duration" class="flex items-center gap-1"><Clock class="h-3 w-3" />{{ formation.duration }}</span>
                <span class="flex items-center gap-1 font-medium text-teal-600">
                  <Users class="h-3 w-3" />
                  {{ formation.participants }} inscrit{{ formation.participants > 1 ? 's' : '' }}
                </span>
                <span v-if="formatDateRange(formation)" class="flex items-center gap-1"><Calendar class="h-3 w-3" />{{ formatDateRange(formation) }}</span>
                <span v-if="formation.departments.length > 0" class="flex items-center gap-1 text-teal-600">
                  <Building2 class="h-3 w-3" />
                  {{ formation.departments.includes('Tous les départements') ? 'Tous les départements' : formation.departments.join(', ') }}
                </span>
              </div>
            </div>

            <!-- Actions + chevron -->
            <div class="flex shrink-0 items-center gap-2">
              <button
                v-if="formation.status === 'brouillon'"
                @click.stop="handlePublishDirect(formation.id)"
                :disabled="publishingId === formation.id"
                class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                <svg v-if="publishingId === formation.id" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <Send v-else class="h-3.5 w-3.5" />
                {{ publishingId === formation.id ? 'Envoi...' : 'Envoyer' }}
              </button>
              <button
                @click.stop="openEditModal(formation.id)"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600"
              >
                <Pencil class="h-3.5 w-3.5" />
                Modifier
              </button>
              <button
                @click.stop="openDeleteModal(formation.id)"
                class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
              <ChevronDown
                class="h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0"
                :class="openFormationId === formation.id ? 'rotate-180 text-teal-500' : ''"
              />
            </div>
          </div>

          <!-- Panneau inscrits -->
          <div v-if="openFormationId === formation.id" class="border-t bg-teal-50/40 px-6 py-4">
            <!-- Chargement -->
            <div v-if="loadingEnrollment[formation.id]" class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="h-4 w-4 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Chargement des inscrits…
            </div>
            <!-- Aucun inscrit -->
            <div v-else-if="!enrolledCache[formation.id]?.length" class="flex items-center gap-2 text-xs text-gray-400">
              <UserCheck class="h-4 w-4" />
              Aucun employé inscrit à cette formation pour l'instant.
            </div>
            <!-- Liste inscrits -->
            <div v-else>
              <p class="mb-3 flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                <UserCheck class="h-3.5 w-3.5" />
                {{ enrolledCache[formation.id].length }} employé{{ enrolledCache[formation.id].length > 1 ? 's' : '' }} inscrit{{ enrolledCache[formation.id].length > 1 ? 's' : '' }}
              </p>
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="emp in enrolledCache[formation.id]"
                  :key="emp.name"
                  class="flex items-center justify-between rounded-lg border border-teal-100 bg-white px-3 py-2"
                >
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-900">{{ emp.name }}</p>
                    <p class="truncate text-xs text-gray-400">{{ emp.department }} · {{ emp.position }}</p>
                  </div>
                  <span class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="statusRegConfig[emp.status]?.class">
                    {{ statusRegConfig[emp.status]?.label ?? emp.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- VUE GRILLE -->
      <div v-else class="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="formation in filteredFormations"
          :key="formation.id"
          class="flex flex-col rounded-xl border border-gray-200 bg-gray-50/40 p-4 transition hover:shadow-sm cursor-pointer"
          :class="openFormationId === formation.id ? 'border-teal-200 bg-teal-50/20' : ''"
          @click="toggleEnrollees(formation.id)"
        >
          <!-- En-tête carte -->
          <div class="mb-3 flex items-start gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              :class="{
                'bg-amber-100': formation.status === 'brouillon',
                'bg-green-100': formation.status === 'disponible',
                'bg-teal-100':  formation.status === 'en_cours',
                'bg-gray-100':  formation.status === 'terminée'
              }"
            >
              <FileText     v-if="formation.status === 'brouillon'"   class="h-4 w-4 text-amber-600" />
              <CheckCircle2 v-else-if="formation.status === 'disponible'" class="h-4 w-4 text-green-600" />
              <PlayCircle   v-else-if="formation.status === 'en_cours'"   class="h-4 w-4 text-teal-600" />
              <Archive      v-else                                          class="h-4 w-4 text-gray-500" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-sm font-semibold text-gray-900">{{ formation.title }}</h3>
              <div class="mt-1 flex flex-wrap gap-1">
                <span class="rounded-full px-1.5 py-0.5 text-xs font-medium" :class="statusConfig[formation.status]?.class">{{ statusConfig[formation.status]?.label }}</span>
                <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{{ formation.category }}</span>
                <span class="rounded-full px-1.5 py-0.5 text-xs font-medium" :class="levelConfig[formation.level]?.class">{{ levelConfig[formation.level]?.label }}</span>
              </div>
            </div>
            <ChevronDown
              class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 mt-0.5"
              :class="openFormationId === formation.id ? 'rotate-180 text-teal-500' : ''"
            />
          </div>

          <p class="mb-3 line-clamp-2 text-xs text-gray-500">{{ formation.description || 'Aucune description' }}</p>

          <div class="mb-4 flex-1 space-y-1.5 text-xs text-gray-500">
            <div v-if="formation.duration" class="flex items-center gap-1.5">
              <Clock class="h-3 w-3 text-gray-400 shrink-0" />{{ formation.duration }}
            </div>
            <div class="flex items-center gap-1.5 font-medium text-teal-600">
              <Users class="h-3 w-3 shrink-0" />
              {{ formation.participants }} inscrit{{ formation.participants > 1 ? 's' : '' }}
            </div>
            <div v-if="formatDateRange(formation)" class="flex items-center gap-1.5">
              <Calendar class="h-3 w-3 text-gray-400 shrink-0" />{{ formatDateRange(formation) }}
            </div>
            <div v-if="formation.departments.length > 0" class="flex items-center gap-1.5 text-teal-600">
              <Building2 class="h-3 w-3 shrink-0" />
              <span class="truncate">{{ formation.departments.includes('Tous les départements') ? 'Tous les dép.' : formation.departments.join(', ') }}</span>
            </div>
          </div>

          <!-- Panneau inscrits (dans la carte) -->
          <div v-if="openFormationId === formation.id" class="mb-3 rounded-lg border border-teal-100 bg-white p-3">
            <div v-if="loadingEnrollment[formation.id]" class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="h-3.5 w-3.5 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Chargement…
            </div>
            <div v-else-if="!enrolledCache[formation.id]?.length" class="flex items-center gap-1.5 text-xs text-gray-400">
              <UserCheck class="h-3.5 w-3.5" />Aucun inscrit pour l'instant.
            </div>
            <div v-else>
              <p class="mb-2 flex items-center gap-1 text-xs font-semibold text-teal-700">
                <UserCheck class="h-3.5 w-3.5" />
                {{ enrolledCache[formation.id].length }} inscrit{{ enrolledCache[formation.id].length > 1 ? 's' : '' }}
              </p>
              <div class="space-y-1.5">
                <div
                  v-for="emp in enrolledCache[formation.id]"
                  :key="emp.name"
                  class="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5"
                >
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-900">{{ emp.name }}</p>
                    <p class="truncate text-xs text-gray-400">{{ emp.department }}</p>
                  </div>
                  <span class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="statusRegConfig[emp.status]?.class">
                    {{ statusRegConfig[emp.status]?.label ?? emp.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions carte -->
          <div class="mt-auto flex flex-wrap gap-2">
            <button
              v-if="formation.status === 'brouillon'"
              @click.stop="handlePublishDirect(formation.id)"
              :disabled="publishingId === formation.id"
              class="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              <svg v-if="publishingId === formation.id" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <Send v-else class="h-3 w-3" />
              {{ publishingId === formation.id ? 'Envoi...' : 'Envoyer' }}
            </button>
            <button
              @click.stop="openEditModal(formation.id)"
              class="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600"
            >
              <Pencil class="h-3 w-3" />
              Modifier
            </button>
            <button
              @click.stop="openDeleteModal(formation.id)"
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ MODAL CRÉATION / ÉDITION ══════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showFormModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeFormModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeFormModal" />

          <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">

            <!-- Header modal -->
            <div class="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h3 class="text-lg font-bold text-gray-900">
                  {{ editingFormationId ? 'Modifier la formation' : 'Nouvelle formation' }}
                </h3>
                <p v-if="isBrouillonContext" class="mt-0.5 text-xs text-amber-600">
                  Les brouillons ne sont pas visibles par les employés avant publication
                </p>
              </div>
              <button
                @click="closeFormModal"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Corps du formulaire -->
            <div class="max-h-[70vh] overflow-y-auto p-6 space-y-5">

              <!-- Titre -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Titre <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="Titre de la formation"
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  v-model="form.description"
                  placeholder="Décrivez les objectifs et le contenu de la formation..."
                  rows="3"
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none"
                />
              </div>

              <!-- Catégorie + Niveau -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catégorie</label>
                  <select
                    v-model="form.category"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                  >
                    <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Niveau</label>
                  <select
                    v-model="form.level"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                  >
                    <option value="débutant">Débutant</option>
                    <option value="intermédiaire">Intermédiaire</option>
                    <option value="avancé">Avancé</option>
                  </select>
                </div>
              </div>

              <!-- Durée + Participants -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Durée <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.duration"
                    type="text"
                    placeholder="Ex : 2 jours, 4 heures"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Participants max</label>
                  <input
                    v-model.number="form.participants"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <!-- Dates de début et fin -->
              <div>
                <label class="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Calendar class="h-3.5 w-3.5" />
                  Dates de la formation
                </label>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs text-gray-500">Date de début</label>
                    <input
                      v-model="form.start_date"
                      type="date"
                      class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-gray-500">Date de fin</label>
                    <input
                      v-model="form.end_date"
                      type="date"
                      :min="form.start_date || undefined"
                      class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                </div>
              </div>

              <!-- Statut (uniquement pour l'édition de formations publiées) -->
              <div v-if="!isBrouillonContext">
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                <select
                  v-model="form.status"
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                >
                  <option value="disponible">Disponible</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminée">Terminée</option>
                </select>
              </div>

              <!-- Départements destinataires -->
              <div>
                <div class="mb-3 flex items-center justify-between">
                  <label class="text-sm font-medium text-gray-700">
                    Départements destinataires
                    <span class="text-red-500">*</span>
                  </label>
                  <span class="text-xs text-gray-400">
                    {{ isAllDepts
                      ? 'Tous les départements'
                      : form.departments.length === 0
                        ? 'Aucun sélectionné'
                        : `${form.departments.length} sélectionné(s)` }}
                  </span>
                </div>

                <!-- Grille des départements individuels -->
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label
                    v-for="dept in DEPARTMENTS"
                    :key="dept"
                    class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition select-none"
                    :class="[
                      form.departments.includes(dept) && !isAllDepts
                        ? 'border-teal-400 bg-teal-50 text-teal-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                      isAllDepts ? 'opacity-40 cursor-not-allowed' : ''
                    ]"
                  >
                    <input
                      type="checkbox"
                      :checked="form.departments.includes(dept) && !isAllDepts"
                      :disabled="isAllDepts"
                      @change="toggleDepartment(dept)"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-teal-600"
                    />
                    {{ dept }}
                  </label>
                </div>

                <!-- Tous les départements -->
                <label
                  class="mt-2 flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition select-none"
                  :class="isAllDepts
                    ? 'border-teal-400 bg-teal-50 text-teal-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                >
                  <input
                    type="checkbox"
                    :checked="isAllDepts"
                    @change="toggleAllDepts"
                    class="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  <Building2 class="h-4 w-4 shrink-0" />
                  Tous les départements
                  <span class="ml-auto text-xs font-normal text-gray-400">Sélectionne tout</span>
                </label>
              </div>

            </div>

            <!-- Footer modal -->
            <div class="border-t bg-gray-50/50 px-6 py-4">

              <!-- Contexte brouillon : deux boutons d'action -->
              <div v-if="isBrouillonContext" class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  @click="closeFormModal"
                  class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:mr-auto"
                >
                  Annuler
                </button>
                <button
                  @click="handleSaveDraft"
                  :disabled="formLoading"
                  class="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save class="h-4 w-4" />
                  Enregistrer brouillon
                </button>
                <button
                  @click="handlePublish"
                  :disabled="formLoading"
                  class="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                >
                  <svg v-if="formLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <Send v-else class="h-4 w-4" />
                  {{ formLoading ? 'Envoi...' : 'Envoyer aux départements' }}
                </button>
              </div>

              <!-- Contexte édition publiée : bouton unique -->
              <div v-else class="flex items-center justify-end gap-3">
                <button
                  @click="closeFormModal"
                  class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  @click="handleSave"
                  :disabled="formLoading"
                  class="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
                >
                  <svg v-if="formLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ formLoading ? 'Enregistrement...' : 'Enregistrer les modifications' }}
                </button>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ MODAL SUPPRESSION ══════════════════════════════════════════════════ -->
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
            <h3 class="mt-4 text-lg font-bold text-gray-900">Supprimer cette formation ?</h3>
            <p class="mt-2 text-sm text-gray-500">
              Cette action est irréversible. La formation sera définitivement retirée du catalogue.
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
