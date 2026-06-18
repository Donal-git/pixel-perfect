<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  ShieldCheck,
  UserCog,
  Eye,
  MoreVertical,
  Ban,
  CheckCircle
} from 'lucide-vue-next'
import { usePersonnelStore, type PersonnelMember } from '~/stores/personnel'
import { useAppConfigStore } from '~/stores/appConfig'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

const personnelStore = usePersonnelStore()
const appConfigStore = useAppConfigStore()
const authStore = useAuthStore()
const toast = useToast()

const departments = computed(() => appConfigStore.departmentNames)

// ── État ─────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const ITEMS_PER_PAGE = 10

// Modales
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showDropdownId = ref<string | null>(null)
const editingMember = ref<PersonnelMember | null>(null)
const deletingMember = ref<PersonnelMember | null>(null)

const emptyForm = (): Omit<PersonnelMember, 'id' | 'registeredAt'> => ({
  name: '',
  email: '',
  role: 'employee',
  department: 'RH',
  position: '',
  phone: '',
  status: 'actif'
})

const createForm = ref(emptyForm())
const editForm = ref(emptyForm())

onMounted(async () => {
  await Promise.all([
    personnelStore.loadFromStorage(),
    appConfigStore.loadFromStorage()
  ])
})

// ── Computed ─────────────────────────────────────────────────────────────────
const filteredMembers = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return personnelStore.members.filter(m => {
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.position.toLowerCase().includes(q)
    const matchRole = !roleFilter.value || m.role === roleFilter.value
    const matchStatus = !statusFilter.value || m.status === statusFilter.value
    return matchSearch && matchRole && matchStatus
  })
})

const totalPages = computed(() =>
  Math.ceil(filteredMembers.value.length / ITEMS_PER_PAGE)
)

const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredMembers.value.slice(start, start + ITEMS_PER_PAGE)
})

const stats = computed(() => ({
  total: personnelStore.members.length,
  admin: personnelStore.members.filter(m => m.role === 'admin').length,
  grh: personnelStore.members.filter(m => m.role === 'grh').length,
  employee: personnelStore.members.filter(m => m.role === 'employee').length
}))

// Reset page on filter change
watch([searchQuery, roleFilter, statusFilter], () => {
  currentPage.value = 1
})

// ── Helpers UI ───────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const roleConfig = {
  admin: { label: 'Admin', class: 'bg-red-100 text-red-700 border-red-200' },
  grh: { label: 'GRH', class: 'bg-teal-50 text-teal-700 border-teal-200' },
  employee: { label: 'Employé', class: 'bg-gray-100 text-gray-600 border-gray-200' }
}


const avatarColor = (name: string) => {
  const colors = [
    'bg-teal-500', 'bg-slate-500', 'bg-green-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length
  return colors[h]
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

// ── Actions ──────────────────────────────────────────────────────────────────
const openCreateModal = () => {
  createForm.value = emptyForm()
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createForm.value = emptyForm()
}

const openEditModal = (member: PersonnelMember) => {
  editingMember.value = member
  editForm.value = {
    name: member.name,
    email: member.email,
    role: member.role,
    department: member.department,
    position: member.position,
    phone: member.phone,
    status: member.status
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingMember.value = null
}

const openDeleteModal = (member: PersonnelMember) => {
  deletingMember.value = member
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingMember.value = null
}

const validateCreateForm = (): boolean => {
  if (!createForm.value.name.trim()) {
    toast.error('Le nom est obligatoire')
    return false
  }
  if (!createForm.value.email.trim() || !createForm.value.email.includes('@')) {
    toast.error('Email invalide')
    return false
  }
  if (!createForm.value.position.trim()) {
    toast.error('Le poste est obligatoire')
    return false
  }
  return true
}

const validateEditForm = (): boolean => {
  if (!editForm.value.name.trim()) {
    toast.error('Le nom est obligatoire')
    return false
  }
  if (!editForm.value.email.trim() || !editForm.value.email.includes('@')) {
    toast.error('Email invalide')
    return false
  }
  if (!editForm.value.position.trim()) {
    toast.error('Le poste est obligatoire')
    return false
  }
  return true
}

const handleCreate = async () => {
  if (!validateCreateForm()) return
  try {
    await personnelStore.addMember({ ...createForm.value })
    toast.success('Membre ajouté', createForm.value.name)
    closeCreateModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de créer ce membre')
  }
}

const handleEdit = async () => {
  if (!validateEditForm()) return
  if (editingMember.value) {
    try {
      await personnelStore.updateMember(editingMember.value.id, { ...editForm.value })
      toast.success('Membre mis à jour', editForm.value.name)
      closeEditModal()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de modifier ce membre')
    }
  }
}

const handleDelete = async () => {
  if (deletingMember.value) {
    try {
      await personnelStore.deleteMember(deletingMember.value.id)
      toast.success('Membre supprimé', deletingMember.value.name)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de supprimer ce membre')
    }
  }
  closeDeleteModal()
}

const toggleStatus = async (member: PersonnelMember) => {
  try {
    await personnelStore.toggleStatus(member.id)
    const next = member.status === 'actif' ? 'inactif' : 'actif'
    toast.default(`${member.name} → ${next}`)
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de changer le statut')
  }
}

const toggleDropdown = (id: string) => {
  showDropdownId.value = showDropdownId.value === id ? null : id
}

// Close dropdown when clicking outside
const handleClickOutside = () => {
  showDropdownId.value = null
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER ──────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestion du Personnel</h1>
        <p class="mt-1 text-sm text-gray-500">
          Admin uniquement — {{ personnelStore.members.length }} membre{{ personnelStore.members.length > 1 ? 's' : '' }}
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
      >
        <Plus class="h-4 w-4" />
        Nouveau membre
      </button>
    </div>

    <!-- KPI CARDS ───────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
          <Users class="h-4 w-4 text-slate-600" />
        </div>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Total</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
          <ShieldCheck class="h-4 w-4 text-red-600" />
        </div>
        <p class="text-2xl font-bold text-red-700">{{ stats.admin }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Admins</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
          <UserCog class="h-4 w-4 text-teal-600" />
        </div>
        <p class="text-2xl font-bold text-teal-700">{{ stats.grh }}</p>
        <p class="mt-0.5 text-xs text-gray-500">GRH</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
          <Users class="h-4 w-4 text-gray-600" />
        </div>
        <p class="text-2xl font-bold text-gray-700">{{ stats.employee }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Employés</p>
      </div>
    </div>

    <!-- FILTRES ──────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par nom, email, poste..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>
      <select
        v-model="roleFilter"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
      >
        <option value="">Tous les rôles</option>
        <option value="admin">Admin</option>
        <option value="grh">GRH</option>
        <option value="employee">Employé</option>
      </select>
      <select
        v-model="statusFilter"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
      >
        <option value="">Tous les statuts</option>
        <option value="actif">Actif</option>
        <option value="inactif">Inactif</option>
      </select>
    </div>

    <!-- TABLE ────────────────────────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div class="flex items-center justify-between border-b px-5 py-4">
        <h2 class="font-semibold text-gray-800">
          Personnel
          <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {{ filteredMembers.length }}
          </span>
        </h2>
        <button
          v-if="searchQuery || roleFilter || statusFilter"
          @click="searchQuery = ''; roleFilter = ''; statusFilter = ''"
          class="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Réinitialiser
        </button>
      </div>

      <!-- Vide -->
      <div v-if="filteredMembers.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Users class="h-7 w-7 text-gray-300" />
        </div>
        <p class="mt-4 text-sm font-medium text-gray-500">Aucun membre trouvé</p>
      </div>

      <!-- Tableau -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b bg-gray-50/60">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500">Membre</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500">Département</th>
              <th class="hidden px-5 py-3 text-left text-xs font-semibold text-gray-500 md:table-cell">Poste</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500">Rôle</th>
              <th class="hidden px-5 py-3 text-left text-xs font-semibold text-gray-500 lg:table-cell">Depuis</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500">Statut</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="member in paginatedMembers"
              :key="member.id"
              class="transition hover:bg-gray-50/50"
            >
              <!-- Membre -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    :class="avatarColor(member.name)"
                  >
                    {{ initials(member.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-gray-900">{{ member.name }}</p>
                    <p class="truncate text-xs text-gray-400">{{ member.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Département -->
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {{ member.department }}
                </span>
              </td>

              <!-- Poste -->
              <td class="hidden px-5 py-3.5 text-xs text-gray-600 md:table-cell">
                {{ member.position || '—' }}
              </td>

              <!-- Rôle -->
              <td class="px-5 py-3.5">
                <span
                  class="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  :class="roleConfig[member.role]?.class"
                >
                  {{ roleConfig[member.role]?.label }}
                </span>
              </td>

              <!-- Date -->
              <td class="hidden px-5 py-3.5 text-xs text-gray-400 lg:table-cell">
                {{ formatDate(member.registeredAt) }}
              </td>

              <!-- Statut -->
              <td class="px-5 py-3.5">
                <button
                  @click="toggleStatus(member)"
                  class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:opacity-80"
                  :class="member.status === 'actif'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="member.status === 'actif' ? 'bg-green-500' : 'bg-gray-400'"
                  />
                  {{ member.status === 'actif' ? 'Actif' : 'Inactif' }}
                </button>
              </td>

              <!-- Actions -->
              <td class="px-5 py-3.5 text-right relative">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click.stop="toggleDropdown(member.id)"
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <MoreVertical class="h-3.5 w-3.5" />
                  </button>

                  <!-- Dropdown menu -->
                  <div
                    v-if="showDropdownId === member.id"
                    class="absolute right-12 top-10 z-50 min-w-[160px] rounded-lg border bg-white p-1 shadow-lg"
                    @click.stop
                  >
                    <button
                      @click="openEditModal(member)"
                      class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil class="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      @click="toggleStatus(member); showDropdownId = null"
                      class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CheckCircle class="h-4 w-4" />
                      {{ member.status === 'actif' ? 'Désactiver' : 'Activer' }}
                    </button>
                    <hr class="my-1" />
                    <button
                      @click="openDeleteModal(member); showDropdownId = null"
                      class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 class="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t px-5 py-3">
        <p class="text-xs text-gray-500">
          Page {{ currentPage }} / {{ totalPages }}
        </p>
        <div class="flex gap-1">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            ‹
          </button>
          <button
            v-for="p in totalPages"
            :key="p"
            @click="currentPage = p"
            class="flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition"
            :class="p === currentPage
              ? 'border-teal-500 bg-teal-600 text-white'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >
            {{ p }}
          </button>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            ›
          </button>
        </div>
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
          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between border-b px-6 py-4">
              <h3 class="text-lg font-bold text-gray-900">Nouveau membre</h3>
              <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="max-h-[70vh] overflow-y-auto p-6">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nom complet <span class="text-red-500">*</span></label>
                  <input v-model="createForm.name" type="text" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="Ex: Jean Kaboré" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Email <span class="text-red-500">*</span></label>
                  <input v-model="createForm.email" type="email" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="email@entreprise.com" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                  <input v-model="createForm.phone" type="tel" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="+226 70 00 00 00" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Département <span class="text-red-500">*</span></label>
                  <select v-model="createForm.department" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Poste <span class="text-red-500">*</span></label>
                  <input v-model="createForm.position" type="text" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="Ex: Développeur" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Rôle</label>
                  <select v-model="createForm.role" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option value="employee">Employé</option>
                    <option value="grh">GRH</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                  <select v-model="createForm.status" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="flex gap-3 border-t px-6 py-4">
              <button @click="closeCreateModal" class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button @click="handleCreate" class="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700">Ajouter</button>
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
          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between border-b px-6 py-4">
              <h3 class="text-lg font-bold text-gray-900">Modifier le membre</h3>
              <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="max-h-[70vh] overflow-y-auto p-6">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nom complet <span class="text-red-500">*</span></label>
                  <input v-model="editForm.name" type="text" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Email <span class="text-red-500">*</span></label>
                  <input v-model="editForm.email" type="email" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                  <input v-model="editForm.phone" type="tel" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Département <span class="text-red-500">*</span></label>
                  <select v-model="editForm.department" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Poste <span class="text-red-500">*</span></label>
                  <input v-model="editForm.position" type="text" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Rôle</label>
                  <select v-model="editForm.role" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option value="employee">Employé</option>
                    <option value="grh">GRH</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                  <select v-model="editForm.status" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="flex gap-3 border-t px-6 py-4">
              <button @click="closeEditModal" class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button @click="handleEdit" class="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700">Enregistrer</button>
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
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 class="h-6 w-6 text-red-600" />
            </div>
            <h3 class="mt-4 text-lg font-bold text-gray-900">Supprimer ce membre ?</h3>
            <p class="mt-2 text-sm text-gray-500">
              Cette action est irréversible. {{ deletingMember?.name }} sera définitivement retiré.
            </p>
            <div class="mt-6 flex gap-3">
              <button @click="closeDeleteModal" class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
              <button @click="handleDelete" class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700">Supprimer</button>
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