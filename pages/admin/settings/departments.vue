<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus,
  Building2,
  Edit3,
  Trash2,
  X,
  Users,
} from 'lucide-vue-next'
import { useAppConfigStore, type Department } from '~/stores/appConfig'
import { usePersonnelStore } from '~/stores/personnel'
import { useToast } from '~/composables/useToast'

const appConfigStore = useAppConfigStore()
const personnelStore = usePersonnelStore()
const toast = useToast()

onMounted(async () => {
  await Promise.all([appConfigStore.loadFromStorage(), personnelStore.loadFromStorage()])
})

// ── État ─────────────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const showEditModal   = ref(false)
const showDeleteModal = ref(false)

const editingDept  = ref<Department | null>(null)
const deletingDept = ref<Department | null>(null)

const newDeptName       = ref('')
const newDeptStatus     = ref<'active' | 'inactive'>('active')
const editDeptName      = ref('')
const editDeptStatus    = ref<'active' | 'inactive'>('active')

// ── Computed ─────────────────────────────────────────────────────────────────
const departments = computed(() =>
  appConfigStore.departments.map(dept => {
    const employeeCount = personnelStore.members.filter(
      m => m.department === dept.name && m.status === 'actif'
    ).length
    return {
      ...dept,
      status: (dept.status ?? 'active') as 'active' | 'inactive',
      employeeCount
    }
  }).sort((a, b) => b.employeeCount - a.employeeCount)
)

const totalEmployees = computed(() =>
  departments.value.reduce((sum, d) => sum + d.employeeCount, 0)
)

// ── Actions ──────────────────────────────────────────────────────────────────
const openCreateModal = () => {
  newDeptName.value   = ''
  newDeptStatus.value = 'active'
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
  newDeptName.value     = ''
  newDeptStatus.value   = 'active'
}

const openEditModal = (dept: Department) => {
  editingDept.value   = dept
  editDeptName.value  = dept.name
  editDeptStatus.value = (dept.status ?? 'active') as 'active' | 'inactive'
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingDept.value   = null
}

const openDeleteModal = (dept: Department) => {
  deletingDept.value   = dept
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingDept.value   = null
}

const handleCreate = async () => {
  if (!newDeptName.value.trim()) {
    toast.error('Le nom est obligatoire')
    return
  }
  try {
    await appConfigStore.addDepartment(newDeptName.value.trim(), newDeptStatus.value)
    toast.success('Département créé', newDeptName.value.trim())
    closeCreateModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de créer ce département')
  }
}

const handleEdit = async () => {
  if (!editDeptName.value.trim()) {
    toast.error('Le nom est obligatoire')
    return
  }
  if (editingDept.value) {
    try {
      await appConfigStore.updateDepartment(editingDept.value.id, {
        name: editDeptName.value.trim(), status: editDeptStatus.value
      })
      toast.success('Département mis à jour', editDeptName.value.trim())
      closeEditModal()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de modifier ce département')
    }
  }
}

const handleDelete = async () => {
  if (deletingDept.value) {
    try {
      await appConfigStore.deleteDepartment(deletingDept.value.id)
      toast.success('Département supprimé', deletingDept.value.name)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de supprimer ce département')
    }
  }
  closeDeleteModal()
}

// ── Helpers UI ───────────────────────────────────────────────────────────────
const deptColors = (name: string) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-green-500 to-emerald-600',
    'from-cyan-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-amber-500 to-yellow-600',
    'from-rose-500 to-pink-600',
    'from-teal-500 to-cyan-600'
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length
  return colors[h]
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
</script>

<template>
  <div class="space-y-8">

    <!-- Header ─────────────────────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-gray-900">Départements</h2>
        <p class="mt-2 text-lg text-gray-600">
          {{ departments.length }} départements · {{ totalEmployees }} employés répartis
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        <Plus class="w-5 h-5" />
        Nouveau département
      </button>
    </div>

    <!-- Liste des départements ─────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="dept in departments"
        :key="dept.id"
        class="group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      >
        <!-- En-tête de la carte -->
        <div class="flex items-start justify-between mb-5">
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0"
              :class="deptColors(dept.name)"
            >
              <Building2 class="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 leading-tight">{{ dept.name }}</h3>
              <p class="text-xs text-gray-400 mt-0.5">Créé le {{ formatDate(dept.createdAt) }}</p>
            </div>
          </div>

          <!-- Boutons d'action (visibles au survol) -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              @click="openEditModal(dept)"
              class="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
              title="Modifier"
            >
              <Edit3 class="w-4 h-4" />
            </button>
            <button
              @click="openDeleteModal(dept)"
              class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Supprimer"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Séparateur -->
        <div class="border-t border-gray-100 mb-4" />

        <!-- Pied de carte : employés + statut -->
        <div class="flex items-center justify-between">
          <!-- Total employés -->
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Users class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-emerald-600 leading-none">
                {{ dept.employeeCount }}
              </p>
              <p class="text-[11px] text-gray-400 uppercase tracking-wide mt-0.5">
                {{ dept.employeeCount <= 1 ? 'Employé' : 'Employés' }}
              </p>
            </div>
          </div>

          <!-- Badge statut -->
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            :class="dept.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="dept.status === 'active' ? 'bg-green-500' : 'bg-gray-400'"
            />
            {{ dept.status === 'active' ? 'Actif' : 'Inactif' }}
          </span>
        </div>
      </div>

      <!-- État vide -->
      <div
        v-if="departments.length === 0"
        class="col-span-full flex flex-col items-center justify-center py-16 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <Building2 class="h-8 w-8 text-gray-400" />
        </div>
        <p class="text-lg font-medium text-gray-900">Aucun département</p>
        <p class="text-sm text-gray-500 mt-1">Commencez par créer votre premier département</p>
      </div>
    </div>

    <!-- MODAL CRÉATION ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeCreateModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <!-- En-tête -->
            <div class="flex items-center justify-between border-b px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Building2 class="h-5 w-5 text-teal-600" />
                </div>
                <h3 class="text-lg font-bold text-gray-900">Nouveau département</h3>
              </div>
              <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Corps -->
            <div class="p-6 space-y-5">
              <!-- Nom -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nom du département <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newDeptName"
                  type="text"
                  placeholder="Ex: Ressources Humaines"
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  autofocus
                />
              </div>

              <!-- Toggle statut -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">Statut</label>
                <div class="flex items-center gap-4">
                  <span
                    class="text-sm transition-colors"
                    :class="newDeptStatus === 'inactive' ? 'text-gray-700 font-medium' : 'text-gray-400'"
                  >
                    Inactif
                  </span>

                  <button
                    type="button"
                    role="switch"
                    :aria-checked="newDeptStatus === 'active'"
                    @click="newDeptStatus = newDeptStatus === 'active' ? 'inactive' : 'active'"
                    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    :class="newDeptStatus === 'active' ? 'bg-teal-600' : 'bg-gray-200'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200"
                      :class="newDeptStatus === 'active' ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>

                  <span
                    class="text-sm transition-colors"
                    :class="newDeptStatus === 'active' ? 'text-teal-600 font-medium' : 'text-gray-400'"
                  >
                    Actif
                  </span>
                </div>
              </div>
            </div>

            <!-- Pied -->
            <div class="flex gap-3 border-t px-6 py-4">
              <button
                @click="closeCreateModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="handleCreate"
                class="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL ÉDITION ───────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showEditModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeEditModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <!-- En-tête -->
            <div class="flex items-center justify-between border-b px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Edit3 class="h-5 w-5 text-teal-600" />
                </div>
                <h3 class="text-lg font-bold text-gray-900">Modifier le département</h3>
              </div>
              <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Corps -->
            <div class="p-6 space-y-5">
              <!-- Nom -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nom du département <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editDeptName"
                  type="text"
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  autofocus
                />
              </div>

              <!-- Toggle statut -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">Statut</label>
                <div class="flex items-center gap-4">
                  <span
                    class="text-sm transition-colors"
                    :class="editDeptStatus === 'inactive' ? 'text-gray-700 font-medium' : 'text-gray-400'"
                  >
                    Inactif
                  </span>

                  <button
                    type="button"
                    role="switch"
                    :aria-checked="editDeptStatus === 'active'"
                    @click="editDeptStatus = editDeptStatus === 'active' ? 'inactive' : 'active'"
                    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    :class="editDeptStatus === 'active' ? 'bg-teal-600' : 'bg-gray-200'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200"
                      :class="editDeptStatus === 'active' ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>

                  <span
                    class="text-sm transition-colors"
                    :class="editDeptStatus === 'active' ? 'text-teal-600 font-medium' : 'text-gray-400'"
                  >
                    Actif
                  </span>
                </div>
              </div>
            </div>

            <!-- Pied -->
            <div class="flex gap-3 border-t px-6 py-4">
              <button
                @click="closeEditModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="handleEdit"
                class="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL SUPPRESSION ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeDeleteModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 class="h-6 w-6 text-red-600" />
            </div>
            <h3 class="text-lg font-bold text-gray-900">Supprimer ce département ?</h3>
            <p class="mt-2 text-sm text-gray-500">
              Le département <strong>{{ deletingDept?.name }}</strong> sera définitivement supprimé.
            </p>
            <div class="mt-6 flex gap-3">
              <button
                @click="closeDeleteModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="handleDelete"
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
