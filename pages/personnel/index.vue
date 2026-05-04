<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Search, Pencil, Trash2, X, Users,
  Building2, ShieldCheck, UserCog, User, ToggleLeft, ToggleRight
} from 'lucide-vue-next'
import { usePersonnelStore, type PersonnelMember } from '~/stores/personnel'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

const personnelStore = usePersonnelStore()
const authStore = useAuthStore()
const toast = useToast()

// ── Vérification rôle ───────────────────────────────────────────────────────
// Les GRH ne peuvent pas modifier/supprimer/ajouter du personnel
const isAdmin = computed(() => authStore.role === 'admin')

const DEPARTMENTS = [
  'Direction', 'RH', 'Finance', 'IT',
  'Commercial', 'Production', 'Marketing', 'Logistique'
]

// ── Filtres ────────────────────────────────────────────────────────────────
const searchQuery    = ref('')
const roleFilter     = ref('')
const deptFilter     = ref('')
const statusFilter   = ref('')
const currentPage    = ref(1)
const ITEMS_PER_PAGE = 10

// ── Modales ────────────────────────────────────────────────────────────────
const showFormModal   = ref(false)
const showDeleteModal = ref(false)
const editingId       = ref<string | null>(null)
const deletingId      = ref<string | null>(null)
const formLoading     = ref(false)

const emptyForm = (): Omit<PersonnelMember, 'id' | 'registeredAt'> => ({
  name:       '',
  email:      '',
  role:       'employee',
  department: 'RH',
  position:   '',
  phone:      '',
  status:     'actif'
})

const form = ref(emptyForm())

onMounted(() => personnelStore.loadFromStorage())

// ── Computed ───────────────────────────────────────────────────────────────
const filteredMembers = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return personnelStore.members.filter(m => {
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.position.toLowerCase().includes(q)
    const matchRole   = !roleFilter.value   || m.role       === roleFilter.value
    const matchDept   = !deptFilter.value   || m.department === deptFilter.value
    const matchStatus = !statusFilter.value || m.status     === statusFilter.value
    return matchSearch && matchRole && matchDept && matchStatus
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
  total:    personnelStore.members.length,
  actif:    personnelStore.members.filter(m => m.status === 'actif').length,
  admin:    personnelStore.members.filter(m => m.role === 'admin').length,
  grh:      personnelStore.members.filter(m => m.role === 'grh').length,
  employee: personnelStore.members.filter(m => m.role === 'employee').length
}))

// Reset page when filters change
watch([searchQuery, roleFilter, deptFilter, statusFilter], () => {
  currentPage.value = 1
})

// ── Actions modal ──────────────────────────────────────────────────────────
const openCreateModal = () => {
  editingId.value = null
  form.value = emptyForm()
  showFormModal.value = true
}

const openEditModal = (member: PersonnelMember) => {
  editingId.value = member.id
  form.value = {
    name:       member.name,
    email:      member.email,
    role:       member.role,
    department: member.department,
    position:   member.position,
    phone:      member.phone,
    status:     member.status
  }
  showFormModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
  editingId.value = null
}

const validateForm = () => {
  if (!form.value.name.trim()) {
    toast.error('Le nom est obligatoire')
    return false
  }
  if (!form.value.email.trim() || !form.value.email.includes('@')) {
    toast.error('Adresse email invalide')
    return false
  }
  if (!form.value.position.trim()) {
    toast.error('Le poste est obligatoire')
    return false
  }
  return true
}

const handleSubmitForm = async () => {
  if (!validateForm()) return
  formLoading.value = true
  await new Promise(r => setTimeout(r, 350))

  if (editingId.value) {
    personnelStore.updateMember(editingId.value, { ...form.value })
    toast.success('Membre mis à jour', `${form.value.name} — ${form.value.department}`)
  } else {
    personnelStore.addMember({ ...form.value })
    toast.success('Membre ajouté', `${form.value.name} — ${form.value.department}`)
  }

  formLoading.value = false
  closeFormModal()
}

// ── Suppression ────────────────────────────────────────────────────────────
const openDeleteModal = (id: string) => {
  deletingId.value = id
  showDeleteModal.value = true
}

const confirmDelete = () => {
  if (deletingId.value) {
    const m = personnelStore.getMemberById(deletingId.value)
    personnelStore.deleteMember(deletingId.value)
    toast.success('Membre supprimé', m?.name ?? '')
  }
  showDeleteModal.value = false
  deletingId.value = null
}

// ── Toggle statut ──────────────────────────────────────────────────────────
const handleToggleStatus = (member: PersonnelMember) => {
  personnelStore.toggleStatus(member.id)
  const next = member.status === 'actif' ? 'inactif' : 'actif'
  toast.default(`${member.name} → ${next}`)
}

// ── Helpers UI ─────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const roleConfig = {
  admin:    { label: 'Admin',   class: 'bg-red-100 text-red-700 border-red-200'    },
  grh:      { label: 'GRH',    class: 'bg-blue-100 text-blue-700 border-blue-200'  },
  employee: { label: 'Employé', class: 'bg-gray-100 text-gray-600 border-gray-200' }
}

const deptColors: Record<string, string> = {
  Direction:  'bg-violet-100 text-violet-700',
  RH:         'bg-pink-100 text-pink-700',
  Finance:    'bg-green-100 text-green-700',
  IT:         'bg-cyan-100 text-cyan-700',
  Commercial: 'bg-orange-100 text-orange-700',
  Production: 'bg-amber-100 text-amber-700',
  Marketing:  'bg-rose-100 text-rose-700',
  Logistique: 'bg-teal-100 text-teal-700'
}

const avatarColor = (name: string) => {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length
  return colors[h]
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER ──────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestion du Personnel</h1>
        <p class="mt-1 text-sm text-gray-500">
          {{ personnelStore.members.length }} membre{{ personnelStore.members.length > 1 ? 's' : '' }} enregistré{{ personnelStore.members.length > 1 ? 's' : '' }}
        </p>
      </div>
      <button
        v-if="isAdmin"
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        <Plus class="h-4 w-4" />
        Nouveau membre
      </button>
    </div>

    <!-- KPI CARDS ───────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
          <Users class="h-4 w-4 text-blue-600" />
        </div>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Total</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-green-100">
          <User class="h-4 w-4 text-green-600" />
        </div>
        <p class="text-2xl font-bold text-green-700">{{ stats.actif }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Actifs</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
          <ShieldCheck class="h-4 w-4 text-red-600" />
        </div>
        <p class="text-2xl font-bold text-red-700">{{ stats.admin }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Admins</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
          <UserCog class="h-4 w-4 text-blue-600" />
        </div>
        <p class="text-2xl font-bold text-blue-700">{{ stats.grh }}</p>
        <p class="mt-0.5 text-xs text-gray-500">GRH</p>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
          <Building2 class="h-4 w-4 text-gray-600" />
        </div>
        <p class="text-2xl font-bold text-gray-700">{{ personnelStore.byDepartment.length }}</p>
        <p class="mt-0.5 text-xs text-gray-500">Départements</p>
      </div>
    </div>

    <!-- RÉPARTITION PAR DÉPARTEMENT ─────────────────────────────────────── -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="{ dept, count } in personnelStore.byDepartment"
        :key="dept"
        @click="deptFilter = deptFilter === dept ? '' : dept"
        class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition hover:shadow-sm"
        :class="deptFilter === dept
          ? `${deptColors[dept] || 'bg-gray-100 text-gray-700'} border-current`
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
      >
        <span
          class="flex h-4 w-4 items-center justify-center rounded-full text-white text-[10px] font-bold"
          :class="deptFilter === dept ? 'bg-current opacity-80' : 'bg-gray-400'"
          style="font-size:9px"
        >{{ dept[0] }}</span>
        {{ dept }}
        <span class="rounded-full bg-white/60 px-1">{{ count }}</span>
      </button>
    </div>

    <!-- FILTRES ──────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par nom, email, poste, département..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <select
        v-model="deptFilter"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
      >
        <option value="">Tous les départements</option>
        <option v-for="d in DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
      </select>
      <select
        v-model="roleFilter"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
      >
        <option value="">Tous les rôles</option>
        <option value="admin">Admin</option>
        <option value="grh">GRH</option>
        <option value="employee">Employé</option>
      </select>
      <select
        v-model="statusFilter"
        class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
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
          v-if="searchQuery || roleFilter || deptFilter || statusFilter"
          @click="searchQuery = ''; roleFilter = ''; deptFilter = ''; statusFilter = ''"
          class="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Réinitialiser les filtres
        </button>
      </div>

      <!-- Vide -->
      <div
        v-if="filteredMembers.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Users class="h-7 w-7 text-gray-300" />
        </div>
        <p class="mt-4 text-sm font-medium text-gray-500">Aucun membre trouvé</p>
        <p class="mt-1 text-xs text-gray-400">Modifiez vos filtres ou ajoutez un nouveau membre.</p>
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
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="deptColors[member.department] || 'bg-gray-100 text-gray-600'"
                >
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
                  @click="handleToggleStatus(member)"
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

              <!-- Actions (Admin uniquement) -->
              <td class="px-5 py-3.5 text-right">
                <div v-if="isAdmin" class="flex items-center justify-end gap-1.5">
                  <button
                    @click="openEditModal(member)"
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    title="Modifier"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="openDeleteModal(member.id)"
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between border-t px-5 py-3"
      >
        <p class="text-xs text-gray-500">
          Page {{ currentPage }} / {{ totalPages }}
          ({{ filteredMembers.length }} résultat{{ filteredMembers.length > 1 ? 's' : '' }})
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
              ? 'border-blue-500 bg-blue-600 text-white'
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
                {{ editingId ? 'Modifier le membre' : 'Nouveau membre' }}
              </h3>
              <button
                @click="closeFormModal"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Corps -->
            <div class="max-h-[70vh] overflow-y-auto p-6">
              <div class="grid gap-4 sm:grid-cols-2">

                <!-- Nom -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Nom complet <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="Ex : Jean Kaboré"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <!-- Email -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Email <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.email"
                    type="email"
                    placeholder="email@entreprise.com"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <!-- Téléphone -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    placeholder="+226 70 00 00 00"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <!-- Département -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Département <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="form.department"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option v-for="d in DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>

                <!-- Poste -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Poste <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.position"
                    type="text"
                    placeholder="Ex : Développeur Senior"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <!-- Rôle -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Rôle</label>
                  <select
                    v-model="form.role"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="employee">Employé</option>
                    <option value="grh">GRH</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <!-- Statut -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                  <select
                    v-model="form.status"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>

              </div>
            </div>

            <!-- Footer (Admin uniquement) -->
            <div class="flex gap-3 border-t px-6 py-4">
              <button
                @click="closeFormModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                v-if="isAdmin"
                @click="handleSubmitForm"
                :disabled="formLoading"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <svg v-if="formLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ formLoading ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Ajouter le membre') }}
              </button>
              <div v-else class="flex-1 text-center text-sm text-gray-500 py-2.5">
                Lecture seule
              </div>
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
            <h3 class="mt-4 text-lg font-bold text-gray-900">Supprimer ce membre ?</h3>
            <p class="mt-2 text-sm text-gray-500">
              Cette action est irréversible. Le membre sera définitivement retiré de la liste du personnel.
            </p>
            <div class="mt-6 flex gap-3">
              <button
                @click="showDeleteModal = false"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                v-if="isAdmin"
                @click="confirmDelete"
                class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Supprimer
              </button>
              <div v-else class="flex-1 text-center text-sm text-gray-500 py-2.5">
                Non autorisé
              </div>
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
