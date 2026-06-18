<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Pencil, Trash2, X, GraduationCap, Clock, Users, BookOpen,
  Search, CheckCircle2, PlayCircle, Archive, FileText, Send, Calendar,
  Building2, Save
} from 'lucide-vue-next'
import { useFormationStore, type Formation } from '~/stores/formation'
import { useToast } from '~/composables/useToast'

const formationStore = useFormationStore()
const toast = useToast()

const DEPARTMENTS = ['RH', 'Finance', 'IT', 'Commercial', 'Production', 'Marketing', 'Direction', 'Logistique']
const ALL_DEPTS   = 'Tous les départements'
const CATEGORIES  = ['Informatique', 'Management', 'Soft Skills', 'Technique', 'Sécurité', 'Juridique', 'Finance', 'Autre']

// ── State ────────────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const filterCategory = ref('all')
const filterStatus   = ref('all')

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

onMounted(async () => { await formationStore.loadFromStorage() })

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
    </div>

    <!-- ── LISTE VIDE ─────────────────────────────────────────────────────── -->
    <div
      v-if="filteredFormations.length === 0"
      class="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center shadow-sm"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <GraduationCap class="h-8 w-8 text-gray-400" />
      </div>
      <p class="mt-4 text-sm font-medium text-gray-900">Aucune formation trouvée</p>
      <p class="mt-1 text-xs text-gray-500">Modifiez vos filtres ou créez une nouvelle formation.</p>
    </div>

    <!-- ── GRILLE DES FORMATIONS ──────────────────────────────────────────── -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="formation in filteredFormations"
        :key="formation.id"
        class="flex flex-col rounded-xl border bg-white shadow-sm transition hover:shadow-md"
        :class="formation.status === 'brouillon' ? 'border-dashed border-amber-200 bg-amber-50/20' : ''"
      >
        <!-- En-tête de carte -->
        <div class="flex items-start justify-between p-5 pb-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ formation.category }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="levelConfig[formation.level]?.class"
              >{{ levelConfig[formation.level]?.label }}</span>
            </div>
            <h3 class="text-sm font-bold text-gray-900 leading-snug">{{ formation.title }}</h3>
          </div>
          <span
            class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusConfig[formation.status]?.class"
          >{{ statusConfig[formation.status]?.label }}</span>
        </div>

        <!-- Description -->
        <p class="px-5 text-xs text-gray-500 leading-relaxed line-clamp-2">{{ formation.description }}</p>

        <!-- Dates -->
        <div
          v-if="formatDateRange(formation)"
          class="mt-3 px-5 flex items-center gap-1.5 text-xs text-gray-500"
        >
          <Calendar class="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>{{ formatDateRange(formation) }}</span>
        </div>

        <!-- Méta -->
        <div class="mt-3 px-5 flex flex-wrap gap-3 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5 text-gray-400" />
            {{ formation.duration }}
          </span>
          <span class="flex items-center gap-1">
            <Users class="h-3.5 w-3.5 text-gray-400" />
            {{ formation.participants }} participant{{ formation.participants > 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1">
            <BookOpen class="h-3.5 w-3.5 text-gray-400" />
            {{ formatDate(formation.created_at) }}
          </span>
        </div>

        <!-- Départements destinataires -->
        <div class="mt-3 px-5">
          <div class="flex items-center gap-1.5 mb-1.5">
            <Building2 class="h-3.5 w-3.5 text-gray-400" />
            <span class="text-xs text-gray-400">Destinataires</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-if="formation.departments.includes('Tous les départements')"
              class="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-600"
            >Tous les départements</span>
            <template v-else>
              <span
                v-for="dept in formation.departments.slice(0, 4)"
                :key="dept"
                class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >{{ dept }}</span>
              <span
                v-if="formation.departments.length > 4"
                class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-400"
              >+{{ formation.departments.length - 4 }}</span>
              <span
                v-if="formation.departments.length === 0"
                class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-400 italic"
              >Aucun</span>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-auto flex gap-2 border-t p-4">
          <!-- Bouton Envoyer (brouillons uniquement) -->
          <button
            v-if="formation.status === 'brouillon'"
            @click="handlePublishDirect(formation.id)"
            :disabled="publishingId === formation.id"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            <svg v-if="publishingId === formation.id" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <Send v-else class="h-3.5 w-3.5" />
            {{ publishingId === formation.id ? 'Envoi...' : 'Envoyer' }}
          </button>

          <button
            @click="openEditModal(formation.id)"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600"
          >
            <Pencil class="h-3.5 w-3.5" />
            Modifier
          </button>
          <button
            @click="openDeleteModal(formation.id)"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
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
