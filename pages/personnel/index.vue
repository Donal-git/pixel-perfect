<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Plus, Search, Pencil, Trash2, X, Users,
  Building2, ShieldCheck, UserCog, User,
  Eye, EyeOff, RefreshCw, Copy, Check, KeyRound
} from 'lucide-vue-next'
import { usePersonnelStore, type PersonnelMember } from '~/stores/personnel'
import { useAppConfigStore } from '~/stores/appConfig'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

const personnelStore = usePersonnelStore()
const appConfigStore = useAppConfigStore()
const authStore = useAuthStore()
const toast = useToast()

// ── Vérification rôle ───────────────────────────────────────────────────────
const isAdmin = computed(() => authStore.role === 'admin')

const DEPARTMENTS = computed(() => appConfigStore.departmentNames)

// ── Filtres ────────────────────────────────────────────────────────────────
const searchQuery    = ref('')
const roleFilter     = ref('')
const deptFilter     = ref('')
const statusFilter   = ref('')
const currentPage    = ref(1)
const ITEMS_PER_PAGE = 10

// ── Modales ────────────────────────────────────────────────────────────────
const showFormModal        = ref(false)
const showDeleteModal      = ref(false)
const showCredentialsModal = ref(false)
const editingId            = ref<string | null>(null)
const deletingId           = ref<string | null>(null)
const formLoading          = ref(false)

// ── Mot de passe généré (création uniquement) ──────────────────────────────
const generatedPassword  = ref('')
const showPasswordInForm = ref(false)
const copiedInForm       = ref(false)

// ── Modal identifiants post-création ──────────────────────────────────────
const createdCredentials   = ref<{ name: string; email: string; password: string } | null>(null)
const showPasswordInModal  = ref(false)
const copiedEmail          = ref(false)
const copiedPassword       = ref(false)
const copiedAll            = ref(false)

const emptyForm = (): Omit<PersonnelMember, 'id' | 'registeredAt' | 'password'> => ({
  name:       '',
  email:      '',
  role:       'employee',
  department: appConfigStore.departmentNames[0] ?? 'RH',
  position:   '',
  phone:      '',
  status:     'actif'
})

const form = ref(emptyForm())

onMounted(async () => {
  await Promise.all([
    personnelStore.loadFromStorage(),
    appConfigStore.loadFromStorage()
  ])
})

// ── Générateur de mot de passe sécurisé ───────────────────────────────────
const generatePassword = (): string => {
  const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$!%&'
  const all     = upper + lower + digits + special

  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint8Array(1))[0] % chars.length]

  const pwd = [
    pick(upper), pick(upper),
    pick(lower), pick(lower),
    pick(digits), pick(digits),
    pick(special),
    ...Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => all[b % all.length])
  ]

  // Fisher-Yates shuffle
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint8Array(1))[0] % (i + 1)
    ;[pwd[i], pwd[j]] = [pwd[j], pwd[i]]
  }
  return pwd.join('')
}

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

watch([searchQuery, roleFilter, deptFilter, statusFilter], () => {
  currentPage.value = 1
})

// ── Actions modal formulaire ───────────────────────────────────────────────
const openCreateModal = () => {
  editingId.value       = null
  form.value            = emptyForm()
  generatedPassword.value = generatePassword()
  showPasswordInForm.value = false
  copiedInForm.value       = false
  showFormModal.value   = true
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

const closeCredentialsModal = () => {
  showCredentialsModal.value = false
  createdCredentials.value   = null
  showPasswordInModal.value  = false
  copiedEmail.value          = false
  copiedPassword.value       = false
  copiedAll.value            = false
}

// ── Régénérer / copier le mot de passe dans le formulaire ─────────────────
const regeneratePassword = () => {
  generatedPassword.value  = generatePassword()
  showPasswordInForm.value = false
  copiedInForm.value       = false
}

const copyPasswordInForm = async () => {
  await navigator.clipboard.writeText(generatedPassword.value)
  copiedInForm.value = true
  setTimeout(() => { copiedInForm.value = false }, 2000)
}

// ── Copie depuis la modal identifiants ────────────────────────────────────
const copyEmailToClipboard = async () => {
  if (!createdCredentials.value) return
  await navigator.clipboard.writeText(createdCredentials.value.email)
  copiedEmail.value = true
  setTimeout(() => { copiedEmail.value = false }, 2000)
}

const copyPasswordToClipboard = async () => {
  if (!createdCredentials.value) return
  await navigator.clipboard.writeText(createdCredentials.value.password)
  copiedPassword.value = true
  setTimeout(() => { copiedPassword.value = false }, 2000)
}

const copyAllCredentials = async () => {
  if (!createdCredentials.value) return
  const text = `Email : ${createdCredentials.value.email}\nMot de passe : ${createdCredentials.value.password}`
  await navigator.clipboard.writeText(text)
  copiedAll.value = true
  setTimeout(() => { copiedAll.value = false }, 2500)
}

// ── Validation ─────────────────────────────────────────────────────────────
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

// ── Soumission du formulaire ───────────────────────────────────────────────
const handleSubmitForm = async () => {
  if (!validateForm()) return
  formLoading.value = true

  try {
    if (editingId.value) {
      await personnelStore.updateMember(editingId.value, { ...form.value })
      toast.success('Membre mis à jour', `${form.value.name} — ${form.value.department}`)
      closeFormModal()
    } else {
      const member = await personnelStore.addMember({ ...form.value, password: generatedPassword.value })
      createdCredentials.value = { name: member.name, email: member.email, password: generatedPassword.value }
      closeFormModal()
      showCredentialsModal.value = true
    }
  } catch (err: any) {
    toast.error(err?.data?.message || 'Une erreur est survenue')
  } finally {
    formLoading.value = false
  }
}

// ── Suppression ────────────────────────────────────────────────────────────
const openDeleteModal = (id: string) => {
  deletingId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (deletingId.value) {
    const m = personnelStore.getMemberById(deletingId.value)
    try {
      await personnelStore.deleteMember(deletingId.value)
      toast.success('Membre supprimé', m?.name ?? '')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de supprimer ce membre')
    }
  }
  showDeleteModal.value = false
  deletingId.value = null
}

// ── Toggle statut ──────────────────────────────────────────────────────────
const handleToggleStatus = async (member: PersonnelMember) => {
  try {
    await personnelStore.toggleStatus(member.id)
    const next = member.status === 'actif' ? 'inactif' : 'actif'
    toast.default(`${member.name} → ${next}`)
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de modifier le statut')
  }
}

// ── Helpers UI ─────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const roleConfig = {
  admin:    { label: 'Admin',   class: 'bg-red-100 text-red-700 border-red-200'    },
  grh:      { label: 'GRH',    class: 'bg-teal-50 text-teal-700 border-teal-200'  },
  employee: { label: 'Employé', class: 'bg-gray-100 text-gray-600 border-gray-200' }
}


const avatarColor = (name: string | undefined) => {
  const colors = [
    'bg-teal-500', 'bg-slate-500', 'bg-green-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  if (!name || typeof name !== 'string') return colors[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length
  return colors[h]
}

const initials = (name: string | undefined) => {
  if (!name || typeof name !== 'string') return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
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
        class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
      >
        <Plus class="h-4 w-4" />
        Nouveau membre
      </button>
    </div>

    <!-- KPI CARDS ───────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
          <Users class="h-4 w-4 text-teal-600" />
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
        <div class="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
          <UserCog class="h-4 w-4 text-teal-600" />
        </div>
        <p class="text-2xl font-bold text-teal-700">{{ stats.grh }}</p>
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
          ? 'bg-teal-50 text-teal-700 border-teal-300'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
      >
        <span
          class="flex h-4 w-4 items-center justify-center rounded-full text-white text-[10px] font-bold"
          :class="deptFilter === dept ? 'bg-teal-500' : 'bg-gray-400'"
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
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>
      <select v-model="deptFilter" class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
        <option value="">Tous les départements</option>
        <option v-for="d in DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
      </select>
      <select v-model="roleFilter" class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
        <option value="">Tous les rôles</option>
        <option value="admin">Admin</option>
        <option value="grh">GRH</option>
        <option value="employee">Employé</option>
      </select>
      <select v-model="statusFilter" class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
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
      <div v-if="filteredMembers.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
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
            <tr v-for="member in paginatedMembers" :key="member.id" class="transition hover:bg-gray-50/50">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" :class="avatarColor(member.name)">
                    {{ initials(member.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-gray-900">{{ member.name }}</p>
                    <p class="truncate text-xs text-gray-400">{{ member.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {{ member.department }}
                </span>
              </td>
              <td class="hidden px-5 py-3.5 text-xs text-gray-600 md:table-cell">{{ member.position || '—' }}</td>
              <td class="px-5 py-3.5">
                <span class="rounded-full border px-2.5 py-0.5 text-xs font-medium" :class="roleConfig[member.role]?.class">
                  {{ roleConfig[member.role]?.label }}
                </span>
              </td>
              <td class="hidden px-5 py-3.5 text-xs text-gray-400 lg:table-cell">{{ formatDate(member.registeredAt) }}</td>
              <td class="px-5 py-3.5">
                <button
                  @click="handleToggleStatus(member)"
                  class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:opacity-80"
                  :class="member.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="member.status === 'actif' ? 'bg-green-500' : 'bg-gray-400'" />
                  {{ member.status === 'actif' ? 'Actif' : 'Inactif' }}
                </button>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div v-if="isAdmin" class="flex items-center justify-end gap-1.5">
                  <button @click="openEditModal(member)" class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600" title="Modifier">
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button @click="openDeleteModal(member.id)" class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500" title="Supprimer">
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
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t px-5 py-3">
        <p class="text-xs text-gray-500">
          Page {{ currentPage }} / {{ totalPages }} ({{ filteredMembers.length }} résultat{{ filteredMembers.length > 1 ? 's' : '' }})
        </p>
        <div class="flex gap-1">
          <button @click="currentPage--" :disabled="currentPage === 1" class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">‹</button>
          <button
            v-for="p in totalPages" :key="p" @click="currentPage = p"
            class="flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition"
            :class="p === currentPage ? 'border-teal-500 bg-teal-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >{{ p }}</button>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">›</button>
        </div>
      </div>
    </div>


    <!-- ===== MODAL CRÉATION / ÉDITION ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showFormModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeFormModal">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeFormModal" />

          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between border-b px-6 py-4">
              <h3 class="text-lg font-bold text-gray-900">
                {{ editingId ? 'Modifier le membre' : 'Nouveau membre' }}
              </h3>
              <button @click="closeFormModal" class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
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
                  <input v-model="form.name" type="text" placeholder="Ex : Jean Kaboré"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>

                <!-- Email -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Email <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.email" type="email" placeholder="email@entreprise.com"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>

                <!-- Téléphone -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                  <input v-model="form.phone" type="tel" placeholder="+226 70 00 00 00"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>

                <!-- Département -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Département <span class="text-red-500">*</span>
                  </label>
                  <select v-model="form.department"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option v-for="d in DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>

                <!-- Poste -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Poste <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.position" type="text" placeholder="Ex : Développeur Senior"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>

                <!-- Rôle -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Rôle</label>
                  <select v-model="form.role"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option value="employee">Employé</option>
                    <option value="grh">GRH</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <!-- Statut -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                  <select v-model="form.status"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white">
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>

                <!-- ── Mot de passe généré (création uniquement) ── -->
                <div v-if="!editingId" class="sm:col-span-2">
                  <div class="rounded-xl border border-teal-100 bg-teal-50 p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <KeyRound class="h-4 w-4 text-teal-600" />
                      <span class="text-sm font-semibold text-teal-800">Mot de passe généré automatiquement</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <!-- Champ mot de passe -->
                      <div class="relative flex-1">
                        <input
                          :type="showPasswordInForm ? 'text' : 'password'"
                          :value="generatedPassword"
                          readonly
                          class="w-full rounded-lg border border-teal-200 bg-white px-4 py-2.5 pr-10 text-sm font-mono text-gray-800 outline-none select-all cursor-text"
                        />
                        <button
                          type="button"
                          @click="showPasswordInForm = !showPasswordInForm"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                          :title="showPasswordInForm ? 'Masquer' : 'Afficher'"
                        >
                          <EyeOff v-if="showPasswordInForm" class="h-4 w-4" />
                          <Eye v-else class="h-4 w-4" />
                        </button>
                      </div>

                      <!-- Régénérer -->
                      <button
                        type="button"
                        @click="regeneratePassword"
                        title="Générer un nouveau mot de passe"
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-white text-teal-600 hover:bg-teal-100 transition"
                      >
                        <RefreshCw class="h-4 w-4" />
                      </button>

                      <!-- Copier -->
                      <button
                        type="button"
                        @click="copyPasswordInForm"
                        :title="copiedInForm ? 'Copié !' : 'Copier'"
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition"
                        :class="copiedInForm
                          ? 'border-green-300 bg-green-50 text-green-600'
                          : 'border-teal-200 bg-white text-teal-600 hover:bg-teal-100'"
                      >
                        <Check v-if="copiedInForm" class="h-4 w-4" />
                        <Copy v-else class="h-4 w-4" />
                      </button>
                    </div>

                    <p class="mt-2.5 text-xs text-teal-600/80">
                      Ce mot de passe sera enregistré sur le compte du membre et affiché après la création.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 border-t px-6 py-4">
              <button @click="closeFormModal"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                Annuler
              </button>
              <button v-if="isAdmin" @click="handleSubmitForm" :disabled="formLoading"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50">
                <svg v-if="formLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ formLoading ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Créer le membre') }}
              </button>
              <div v-else class="flex-1 text-center text-sm text-gray-500 py-2.5">Lecture seule</div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ===== MODAL IDENTIFIANTS POST-CRÉATION ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCredentialsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

            <!-- En-tête succès -->
            <div class="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 text-white">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Check class="h-6 w-6" />
                </div>
                <div>
                  <h3 class="text-lg font-bold">Compte créé avec succès</h3>
                  <p class="text-sm text-green-100">
                    Identifiants générés pour <strong>{{ createdCredentials?.name }}</strong>
                  </p>
                </div>
              </div>
            </div>

            <!-- Corps -->
            <div class="p-6 space-y-4">
              <p class="text-sm text-gray-500">
                Transmettez ces identifiants au membre pour qu'il puisse accéder à son compte.
              </p>

              <!-- Email -->
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-800 break-all">{{ createdCredentials?.email }}</span>
                  <button
                    @click="copyEmailToClipboard"
                    class="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border transition"
                    :class="copiedEmail ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'"
                    :title="copiedEmail ? 'Copié !' : 'Copier l\'email'"
                  >
                    <Check v-if="copiedEmail" class="h-3.5 w-3.5" />
                    <Copy v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <!-- Mot de passe -->
              <div class="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Mot de passe</p>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-mono font-medium text-gray-800 tracking-widest">
                    {{ showPasswordInModal ? createdCredentials?.password : '••••••••••' }}
                  </span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button
                      @click="showPasswordInModal = !showPasswordInModal"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition"
                      :title="showPasswordInModal ? 'Masquer' : 'Afficher'"
                    >
                      <EyeOff v-if="showPasswordInModal" class="h-3.5 w-3.5" />
                      <Eye v-else class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="copyPasswordToClipboard"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border transition"
                      :class="copiedPassword ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'"
                      :title="copiedPassword ? 'Copié !' : 'Copier le mot de passe'"
                    >
                      <Check v-if="copiedPassword" class="h-3.5 w-3.5" />
                      <Copy v-else class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Avertissement -->
              <div class="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                <span class="text-amber-500 text-base leading-none mt-0.5">⚠</span>
                <p class="text-xs text-amber-700">
                  Ce mot de passe ne sera plus affiché après la fermeture de cette fenêtre. Copiez-le avant de continuer.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 border-t px-6 py-4">
              <button
                @click="copyAllCredentials"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition"
                :class="copiedAll
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
              >
                <Check v-if="copiedAll" class="h-4 w-4" />
                <Copy v-else class="h-4 w-4" />
                {{ copiedAll ? 'Copié !' : 'Copier tout' }}
              </button>
              <button
                @click="closeCredentialsModal"
                class="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ===== MODAL SUPPRESSION ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showDeleteModal = false">
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
              <button @click="showDeleteModal = false"
                class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button v-if="isAdmin" @click="confirmDelete"
                class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700">
                Supprimer
              </button>
              <div v-else class="flex-1 text-center text-sm text-gray-500 py-2.5">Non autorisé</div>
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
