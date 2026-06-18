<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Shield,
  Plus,
  Edit3,
  Trash2,
  X,
  Users,
  Check,
  AlertTriangle,
  Save
} from 'lucide-vue-next'
import { useAppConfigStore, type Role, type PermissionKey } from '~/stores/appConfig'
import { useToast } from '~/composables/useToast'

const appConfigStore = useAppConfigStore()
const toast = useToast()

onMounted(async () => { await appConfigStore.loadFromStorage() })

// ── État ─────────────────────────────────────────────────────────────────────
const roles = computed(() => appConfigStore.roles)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingRoleId = ref<string | null>(null)
const deletingRoleId = ref<string | null>(null)

const newRoleName = ref('')
const newRoleDescription = ref('')

const editRoleName = ref('')
const editRoleDescription = ref('')
const editPermissions = ref<Record<PermissionKey, boolean>>({
  survey_create: false,
  survey_edit: false,
  survey_delete: false,
  survey_view_all: false,
  personnel_create: false,
  personnel_edit: false,
  personnel_delete: false,
  personnel_view_all: false,
  formation_create: false,
  formation_edit: false,
  formation_delete: false,
  formation_view_all: false,
  reports_view: false,
  settings_edit: false,
  roles_edit: false,
  departments_edit: false
})

// ── Groupes de permissions ──────────────────────────────────────────────────
const permissionGroups = computed(() => {
  const allPerms = appConfigStore.ALL_PERMISSIONS
  const groups: Record<string, { key: PermissionKey; label: string; description: string }[]> = {
    'Sondages': [],
    'Personnel': [],
    'Formations': [],
    'Rapports': [],
    'Paramètres': []
  }

  allPerms.forEach(p => {
    if (p.key.startsWith('survey')) groups['Sondages'].push(p)
    else if (p.key.startsWith('personnel')) groups['Personnel'].push(p)
    else if (p.key.startsWith('formation')) groups['Formations'].push(p)
    else if (p.key.startsWith('reports')) groups['Rapports'].push(p)
    else groups['Paramètres'].push(p)
  })

  return groups
})

// ── Actions ──────────────────────────────────────────────────────────────────
const openCreateModal = () => {
  newRoleName.value = ''
  newRoleDescription.value = ''
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const openEditModal = (roleId: string) => {
  const role = appConfigStore.getRoleById(roleId)
  if (!role) return

  editingRoleId.value = roleId
  editRoleName.value = role.name
  editRoleDescription.value = role.description
  editPermissions.value = { ...role.permissions }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingRoleId.value = null
}

const openDeleteModal = (roleId: string) => {
  deletingRoleId.value = roleId
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingRoleId.value = null
}

const handleCreate = async () => {
  if (!newRoleName.value.trim()) {
    toast.error('Le nom est obligatoire')
    return
  }
  try {
    await appConfigStore.addRole(newRoleName.value.trim(), newRoleDescription.value)
    toast.success('Rôle créé', newRoleName.value.trim())
    closeCreateModal()
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de créer ce rôle')
  }
}

const togglePermission = (permission: PermissionKey) => {
  editPermissions.value[permission] = !editPermissions.value[permission]
}

const handleEdit = async () => {
  if (!editRoleName.value.trim()) {
    toast.error('Le nom est obligatoire')
    return
  }
  if (editingRoleId.value) {
    try {
      await appConfigStore.updateRole(editingRoleId.value, {
        name: editRoleName.value.trim(),
        description: editRoleDescription.value,
        permissions: { ...editPermissions.value }
      })
      toast.success('Rôle mis à jour', editRoleName.value.trim())
      closeEditModal()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de modifier ce rôle')
    }
  }
}

const handleDelete = async () => {
  if (deletingRoleId.value) {
    const role = appConfigStore.getRoleById(deletingRoleId.value)
    if (role && role.userCount > 0) {
      toast.error('Impossible de supprimer', `${role.userCount} utilisateurs ont ce rôle`)
      closeDeleteModal()
      return
    }
    try {
      await appConfigStore.deleteRole(deletingRoleId.value)
      toast.success('Rôle supprimé', role?.name || '')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Impossible de supprimer ce rôle')
    }
  }
  closeDeleteModal()
}

// ── Helpers UI ───────────────────────────────────────────────────────────────
const roleVariant = (name: string) => {
  switch (name.toLowerCase()) {
    case 'admin': return 'destructive'
    case 'grh': return 'default'
    default: return 'secondary'
  }
}

const getPermissionCount = (role: Role) => {
  return Object.values(role.permissions).filter(v => v).length
}
</script>

<template>
  <div class="space-y-8">

    <!-- Header ─────────────────────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-gray-900">
          Rôles & Permissions
        </h2>
        <p class="mt-2 text-lg text-gray-600">
          {{ roles.length }} rôles configurés
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        <Plus class="w-5 h-5" />
        Nouveau rôle
      </button>
    </div>

    <!-- Grid des rôles ─────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="role in roles"
        :key="role.id"
        class="group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      >
        <!-- Badge rôle -->
        <div class="absolute top-4 right-4">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
            :class="role.name.toLowerCase() === 'admin'
              ? 'bg-red-100 text-red-700'
              : role.name.toLowerCase() === 'grh'
                ? 'bg-teal-50 text-teal-700'
                : 'bg-gray-100 text-gray-700'"
          >
            {{ role.name }}
          </span>
        </div>

        <!-- Contenu -->
        <div class="mb-6">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900">{{ role.name }}</h3>
              <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ role.description }}</p>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                @click="openEditModal(role.id)"
                class="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                title="Modifier"
              >
                <Edit3 class="w-4 h-4" />
              </button>
              <button
                v-if="role.userCount === 0"
                @click="openDeleteModal(role.id)"
                class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Supprimer"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Permissions (aperçu) -->
        <div class="space-y-2 mb-6">
          <div
            v-for="(perm, key) in role.permissions"
            :key="key"
            class="flex items-center gap-2 text-sm"
          >
            <div
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="perm ? 'bg-green-500' : 'bg-gray-300'"
            />
            <span :class="perm ? 'text-gray-700' : 'text-gray-400 line-through'">
              {{ appConfigStore.ALL_PERMISSIONS.find(p => p.key === key)?.label || key }}
            </span>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-4 pt-4 border-t">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">{{ role.userCount }}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Utilisateurs</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ getPermissionCount(role) }}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Permissions</div>
          </div>
        </div>
      </div>

      <!-- État vide -->
      <div
        v-if="roles.length === 0"
        class="col-span-full flex flex-col items-center justify-center py-16 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <Shield class="h-8 w-8 text-gray-400" />
        </div>
        <p class="text-lg font-medium text-gray-900">Aucun rôle configuré</p>
        <p class="text-sm text-gray-500 mt-1">Commencez par créer votre premier rôle</p>
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
            <div class="flex items-center justify-between border-b px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield class="h-5 w-5 text-purple-600" />
                </div>
                <h3 class="text-lg font-bold text-gray-900">Nouveau rôle</h3>
              </div>
              <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nom du rôle <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newRoleName"
                  type="text"
                  placeholder="Ex: Manager"
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  autofocus
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  v-model="newRoleDescription"
                  rows="3"
                  placeholder="Description du rôle..."
                  class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none"
                />
              </div>
            </div>

            <div class="flex gap-3 border-t px-6 py-4">
              <button @click="closeCreateModal" class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button @click="handleCreate" class="flex-1 rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
                Créer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL ÉDITION (matrice permissions) ─────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showEditModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeEditModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div class="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Edit3 class="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Modifier le rôle</h3>
                  <p class="text-xs text-gray-500">Configurez les permissions</p>
                </div>
              </div>
              <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Corps scrollable -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <!-- Info rôle -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Nom du rôle <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="editRoleName"
                    type="text"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    v-model="editRoleDescription"
                    type="text"
                    class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              <!-- Matrice permissions par groupe -->
              <div
                v-for="(perms, group) in permissionGroups"
                :key="group"
                class="border rounded-xl overflow-hidden"
              >
                <div class="bg-gray-50 px-4 py-3 border-b">
                  <h4 class="font-semibold text-gray-800">{{ group }}</h4>
                </div>
                <div class="divide-y">
                  <div
                    v-for="perm in perms"
                    :key="perm.key"
                    class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{{ perm.label }}</p>
                      <p class="text-xs text-gray-500">{{ perm.description }}</p>
                    </div>
                    <button
                      @click="togglePermission(perm.key)"
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      :class="editPermissions[perm.key] ? 'bg-purple-600' : 'bg-gray-200'"
                    >
                      <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        :class="editPermissions[perm.key] ? 'translate-x-6' : 'translate-x-1'"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between border-t px-6 py-4 flex-shrink-0">
              <div class="text-sm text-gray-500">
                {{ Object.values(editPermissions).filter(v => v).length }} / {{ Object.keys(editPermissions).length }} permissions activées
              </div>
              <div class="flex gap-3">
                <button @click="closeEditModal" class="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  @click="handleEdit"
                  class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
                >
                  <Save class="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
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
              <AlertTriangle class="h-6 w-6 text-red-600" />
            </div>
            <h3 class="text-lg font-bold text-gray-900">Supprimer ce rôle ?</h3>
            <p class="mt-2 text-sm text-gray-500">
              Cette action est irréversible. Assurez-vous qu'aucun utilisateur n'a ce rôle.
            </p>
            <div class="mt-6 flex gap-3">
              <button @click="closeDeleteModal" class="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button @click="handleDelete" class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700">
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