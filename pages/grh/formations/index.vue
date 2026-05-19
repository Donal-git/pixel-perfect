<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  GraduationCap,
  Clock,
  Users,
  BookOpen,
  Search,
  CheckCircle2,
  PlayCircle,
  Archive
} from 'lucide-vue-next'
import { useFormationStore, type Formation } from '~/stores/formation'
import { useToast } from '~/composables/useToast'

const formationStore = useFormationStore()
const toast = useToast()

const DEPARTMENTS = ['RH', 'Finance', 'IT', 'Commercial', 'Production', 'Marketing', 'Direction', 'Logistique', 'Tous les départements']
const CATEGORIES = ['Informatique', 'Management', 'Soft Skills', 'Technique', 'Sécurité', 'Juridique', 'Finance', 'Autre']

// --- Filtres ---
const searchQuery = ref('')
const filterCategory = ref('all')
const filterStatus = ref('all')

// --- Modal création/édition ---
const showFormModal = ref(false)
const editingFormationId = ref<string | null>(null)
const formLoading = ref(false)

// --- Modal suppression ---
const showDeleteModal = ref(false)
const deletingFormationId = ref<string | null>(null)

// --- Formulaire ---
const form = ref({
  title: '',
  description: '',
  category: 'Informatique',
  duration: '',
  level: 'débutant' as Formation['level'],
  status: 'disponible' as Formation['status'],
  departments: [] as string[],
  participants: 0
})

onMounted(async () => { await formationStore.loadFromStorage() })

// --- Filtres appliqués ---
const filteredFormations = computed(() => {
  return formationStore.formations.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCategory = filterCategory.value === 'all' || f.category === filterCategory.value
    const matchStatus = filterStatus.value === 'all' || f.status === filterStatus.value
    return matchSearch && matchCategory && matchStatus
  })
})

const stats = computed(() => ({
  total: formationStore.formations.length,
  available: formationStore.formations.filter(f => f.status === 'disponible').length,
  ongoing: formationStore.formations.filter(f => f.status === 'en_cours').length,
  totalParticipants: formationStore.formations.reduce((acc, f) => acc + f.participants, 0)
}))

// --- Helpers UI ---
const statusConfig = {
  disponible: { label: 'Disponible', class: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  en_cours: { label: 'En cours', class: 'bg-blue-100 text-blue-700', icon: PlayCircle },
  terminée: { label: 'Terminée', class: 'bg-gray-100 text-gray-500', icon: Archive }
}

const levelConfig = {
  débutant: { label: 'Débutant', class: 'bg-emerald-50 text-emerald-700' },
  intermédiaire: { label: 'Intermédiaire', class: 'bg-amber-50 text-amber-700' },
  avancé: { label: 'Avancé', class: 'bg-red-50 text-red-700' }
}

const categoryColors: Record<string, string> = {
  Informatique: 'bg-purple-100 text-purple-700',
  Management: 'bg-blue-100 text-blue-700',
  'Soft Skills': 'bg-pink-100 text-pink-700',
  Technique: 'bg-orange-100 text-orange-700',
  Sécurité: 'bg-red-100 text-red-700',
  Juridique: 'bg-indigo-100 text-indigo-700',
  Finance: 'bg-green-100 text-green-700',
  Autre: 'bg-gray-100 text-gray-600'
}

// --- Actions modal ---
const openCreateModal = () => {
  editingFormationId.value = null
  form.value = {
    title: '',
    description: '',
    category: 'Informatique',
    duration: '',
    level: 'débutant',
    status: 'disponible',
    departments: [],
    participants: 0
  }
  showFormModal.value = true
}

const openEditModal = (id: string) => {
  const formation = formationStore.getFormationById(id)
  if (!formation) return
  editingFormationId.value = id
  form.value = {
    title: formation.title,
    description: formation.description,
    category: formation.category,
    duration: formation.duration,
    level: formation.level,
    status: formation.status,
    departments: [...formation.departments],
    participants: formation.participants
  }
  showFormModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
  editingFormationId.value = null
}

const toggleDepartment = (dept: string) => {
  const idx = form.value.departments.indexOf(dept)
  if (idx === -1) {
    form.value.departments.push(dept)
  } else {
    form.value.departments.splice(idx, 1)
  }
}

const validateForm = () => {
  if (!form.value.title.trim()) {
    toast.error('Le titre est obligatoire')
    return false
  }
  if (!form.value.duration.trim()) {
    toast.error('La durée est obligatoire')
    return false
  }
  if (form.value.departments.length === 0) {
    toast.error('Sélectionnez au moins un département')
    return false
  }
  return true
}

const handleSubmitForm = async () => {
  if (!validateForm()) return
  formLoading.value = true

  try {
    if (editingFormationId.value) {
      await formationStore.updateFormation(editingFormationId.value, { ...form.value })
      toast.success('Formation mise à jour')
    } else {
      await formationStore.createFormation({ ...form.value })
      toast.success('Formation créée', 'La formation a été ajoutée au catalogue')
    }
    closeFormModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Une erreur est survenue')
  } finally {
    formLoading.value = false
  }
}

// --- Suppression ---
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

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Formations</h1>
        <p class="mt-1 text-sm text-gray-500">Gérez le catalogue de formations proposées au personnel</p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        <Plus class="h-4 w-4" />
        Nouvelle formation
      </button>
    </div>

    <!-- STATS -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">Total</p>
        <p class="mt-1 text-3xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="mt-0.5 text-xs text-gray-400">formations</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">Disponibles</p>
        <p class="mt-1 text-3xl font-bold text-green-600">{{ stats.available }}</p>
        <p class="mt-0.5 text-xs text-gray-400">inscriptions ouvertes</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">En cours</p>
        <p class="mt-1 text-3xl font-bold text-blue-600">{{ stats.ongoing }}</p>
        <p class="mt-0.5 text-xs text-gray-400">sessions actives</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-gray-500">Participants</p>
        <p class="mt-1 text-3xl font-bold text-purple-600">{{ stats.totalParticipants }}</p>
        <p class="mt-0.5 text-xs text-gray-400">inscrits au total</p>
      </div>
    </div>

    <!-- FILTRES -->
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher une formation..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <select
        v-model="filterCategory"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
      >
        <option value="all">Toutes les catégories</option>
        <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select
        v-model="filterStatus"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
      >
        <option value="all">Tous les statuts</option>
        <option value="disponible">Disponible</option>
        <option value="en_cours">En cours</option>
        <option value="terminée">Terminée</option>
      </select>
    </div>

    <!-- GRILLE DES FORMATIONS -->
    <div v-if="filteredFormations.length === 0" class="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center shadow-sm">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <GraduationCap class="h-8 w-8 text-gray-400" />
      </div>
      <p class="mt-4 text-sm font-medium text-gray-900">Aucune formation trouvée</p>
      <p class="mt-1 text-xs text-gray-500">Essayez de modifier vos filtres ou créez une nouvelle formation.</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="formation in filteredFormations"
        :key="formation.id"
        class="flex flex-col rounded-xl border bg-white shadow-sm transition hover:shadow-md"
      >
        <!-- Carte header -->
        <div class="flex items-start justify-between p-5 pb-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="categoryColors[formation.category] || 'bg-gray-100 text-gray-600'"
              >
                {{ formation.category }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="levelConfig[formation.level]?.class"
              >
                {{ levelConfig[formation.level]?.label }}
              </span>
            </div>
            <h3 class="text-sm font-bold text-gray-900 leading-snug">{{ formation.title }}</h3>
          </div>
          <span
            class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusConfig[formation.status]?.class"
          >
            {{ statusConfig[formation.status]?.label }}
          </span>
        </div>

        <!-- Description -->
        <p class="px-5 text-xs text-gray-500 leading-relaxed line-clamp-2">
          {{ formation.description }}
        </p>

        <!-- Méta-données -->
        <div class="mt-4 px-5 flex flex-wrap gap-3 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <Clock class="h-3.5 w-3.5 text-gray-400" />
            {{ formation.duration }}
          </span>
          <span class="flex items-center gap-1">
            <Users class="h-3.5 w-3.5 text-gray-400" />
            {{ formation.participants }} participants
          </span>
          <span class="flex items-center gap-1">
            <BookOpen class="h-3.5 w-3.5 text-gray-400" />
            {{ formatDate(formation.created_at) }}
          </span>
        </div>

        <!-- Départements -->
        <div class="mt-3 px-5 flex flex-wrap gap-1">
          <span
            v-for="dept in formation.departments.slice(0, 3)"
            :key="dept"
            class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
          >
            {{ dept }}
          </span>
          <span
            v-if="formation.departments.length > 3"
            class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
          >
            +{{ formation.departments.length - 3 }}
          </span>
        </div>

        <!-- Actions -->
        <div class="mt-auto flex gap-2 border-t p-4">
          <button
            @click="openEditModal(formation.id)"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
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

    <!-- ===== MODAL CRÉATION / ÉDITION ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showFormModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeFormModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeFormModal" />

          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between border-b px-6 py-4">
              <h3 class="text-lg font-bold text-gray-900">
                {{ editingFormationId ? 'Modifier la formation' : 'Nouvelle formation' }}
              </h3>
              <button
                @click="closeFormModal"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Corps -->
            <div class="max-h-[70vh] overflow-y-auto p-6 space-y-4">

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Titre <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.title"
                    type="text"
                    placeholder="Titre de la formation"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    v-model="form.description"
                    placeholder="Décrivez le contenu et les objectifs de la formation..."
                    rows="3"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catégorie</label>
                  <select
                    v-model="form.category"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Durée <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.duration"
                    type="text"
                    placeholder="Ex : 2 jours, 4 heures"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Niveau</label>
                  <select
                    v-model="form.level"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="débutant">Débutant</option>
                    <option value="intermédiaire">Intermédiaire</option>
                    <option value="avancé">Avancé</option>
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                  <select
                    v-model="form.status"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminée">Terminée</option>
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nombre de participants</label>
                  <input
                    v-model.number="form.participants"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>

              <!-- Départements -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">
                  Départements concernés <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label
                    v-for="dept in DEPARTMENTS"
                    :key="dept"
                    class="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition hover:bg-gray-50"
                    :class="form.departments.includes(dept)
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700'"
                  >
                    <input
                      type="checkbox"
                      :checked="form.departments.includes(dept)"
                      @change="toggleDepartment(dept)"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    {{ dept }}
                  </label>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 border-t px-6 py-4">
              <button
                @click="closeFormModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="handleSubmitForm"
                :disabled="formLoading"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <svg v-if="formLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ formLoading ? 'Enregistrement...' : (editingFormationId ? 'Enregistrer' : 'Créer la formation') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== MODAL SUPPRESSION ===== -->
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
