import { defineStore } from 'pinia'

export interface Department {
  id: string
  name: string
  managerId?: string
  employeeCount: number
  createdAt: string
  status?: 'active' | 'inactive'
}

export interface AppConfig {
  companyName: string
  maxSurveysPerMonth: number
  allowAnonymousSurveys: boolean
  requireEmailVerification: boolean
  sessionTimeout: number
  maxLoginAttempts: number
}

export type PermissionKey =
  | 'survey_create' | 'survey_edit' | 'survey_delete' | 'survey_view_all'
  | 'personnel_create' | 'personnel_edit' | 'personnel_delete' | 'personnel_view_all'
  | 'formation_create' | 'formation_edit' | 'formation_delete' | 'formation_view_all'
  | 'reports_view' | 'settings_edit' | 'roles_edit' | 'departments_edit'

export interface RolePermissions {
  survey_create: boolean; survey_edit: boolean; survey_delete: boolean; survey_view_all: boolean
  personnel_create: boolean; personnel_edit: boolean; personnel_delete: boolean; personnel_view_all: boolean
  formation_create: boolean; formation_edit: boolean; formation_delete: boolean; formation_view_all: boolean
  reports_view: boolean; settings_edit: boolean; roles_edit: boolean; departments_edit: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: RolePermissions
  userCount: number
}

const ALL_PERMISSIONS: { key: PermissionKey; label: string; description: string }[] = [
  { key: 'survey_create',     label: 'Créer un sondage',             description: 'Peut créer de nouveaux sondages' },
  { key: 'survey_edit',       label: 'Modifier un sondage',          description: 'Peut modifier les sondages existants' },
  { key: 'survey_delete',     label: 'Supprimer un sondage',         description: 'Peut supprimer des sondages' },
  { key: 'survey_view_all',   label: 'Voir tous les sondages',       description: 'Peut voir tous les sondages' },
  { key: 'personnel_create',  label: 'Créer un membre du personnel', description: 'Peut ajouter de nouveaux membres' },
  { key: 'personnel_edit',    label: 'Modifier un membre',           description: 'Peut modifier les informations du personnel' },
  { key: 'personnel_delete',  label: 'Supprimer un membre',          description: 'Peut supprimer des membres du personnel' },
  { key: 'personnel_view_all',label: 'Voir tout le personnel',       description: 'Peut voir la liste complète du personnel' },
  { key: 'formation_create',  label: 'Créer une formation',          description: 'Peut créer de nouvelles formations' },
  { key: 'formation_edit',    label: 'Modifier une formation',       description: 'Peut modifier les formations existantes' },
  { key: 'formation_delete',  label: 'Supprimer une formation',      description: 'Peut supprimer des formations' },
  { key: 'formation_view_all',label: 'Voir toutes les formations',   description: 'Peut voir toutes les formations' },
  { key: 'reports_view',      label: 'Voir les rapports',            description: 'Peut accéder aux rapports et statistiques' },
  { key: 'settings_edit',     label: 'Modifier les paramètres',      description: 'Peut modifier les paramètres généraux' },
  { key: 'roles_edit',        label: 'Gérer les rôles',              description: 'Peut modifier les rôles et permissions' },
  { key: 'departments_edit',  label: 'Gérer les départements',       description: 'Peut créer/modifier/supprimer des départements' }
]

const defaultConfig: AppConfig = {
  companyName: 'Entreprise RH', maxSurveysPerMonth: 10,
  allowAnonymousSurveys: true, requireEmailVerification: false,
  sessionTimeout: 30, maxLoginAttempts: 5
}

export const useAppConfigStore = defineStore('appConfig', () => {
  const rconfig      = useRuntimeConfig()
  const departments  = ref<Department[]>([])
  const roles        = ref<Role[]>([])
  const config       = ref<AppConfig>({ ...defaultConfig })
  const loaded       = ref(false)

  const headers = (): Record<string, string> => {
    const token = import.meta.client ? localStorage.getItem('auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const api = (path: string, opts: Record<string, any> = {}) =>
    $fetch<any>(`${rconfig.public.apiBase}${path}`, { headers: headers(), ...opts })

  // ── Load all config data ────────────────────────────────────────────────────
  const loadFromStorage = async () => {
    if (!import.meta.client) return
    try {
      const [deptsRes, rolesRes, configRes] = await Promise.all([
        api('/departments?limit=100'),
        api('/roles'),
        api('/config')
      ])
      departments.value = deptsRes.data as Department[]
      roles.value       = rolesRes.data as Role[]
      config.value      = { ...defaultConfig, ...configRes.data }
      loaded.value      = true
    } catch (e) {
      console.error('Erreur chargement config:', e)
      loaded.value = true
    }
  }

  // ── Departments CRUD ────────────────────────────────────────────────────────
  const addDepartment = async (name: string, status: 'active' | 'inactive' = 'active') => {
    const res = await api('/departments', { method: 'POST', body: { name, status } })
    const dept = res.data as Department
    departments.value.push(dept)
    return dept
  }

  const updateDepartment = async (id: string, data: Partial<Department>) => {
    const res = await api(`/departments/${id}`, { method: 'PUT', body: data })
    const updated = res.data as Department
    const idx = departments.value.findIndex(d => d.id === id)
    if (idx !== -1) departments.value[idx] = updated
  }

  const deleteDepartment = async (id: string) => {
    await api(`/departments/${id}`, { method: 'DELETE' })
    departments.value = departments.value.filter(d => d.id !== id)
  }

  const getDepartmentById = (id: string) =>
    departments.value.find(d => d.id === id) ?? null

  // ── Roles CRUD ──────────────────────────────────────────────────────────────
  const addRole = async (name: string, description: string) => {
    const res = await api('/roles', { method: 'POST', body: { name, description } })
    const role = res.data as Role
    roles.value.push(role)
    return role
  }

  const updateRole = async (id: string, data: Partial<Role>) => {
    const res = await api(`/roles/${id}`, { method: 'PUT', body: data })
    const updated = res.data as Role
    const idx = roles.value.findIndex(r => r.id === id)
    if (idx !== -1) roles.value[idx] = updated
  }

  const updateRolePermission = async (roleId: string, permission: PermissionKey, value: boolean) => {
    const res = await api(`/roles/${roleId}/permission`, {
      method: 'PATCH',
      body: { permission, value }
    })
    const updated = res.data as Role
    const idx = roles.value.findIndex(r => r.id === roleId)
    if (idx !== -1) roles.value[idx] = updated
  }

  const deleteRole = async (id: string) => {
    await api(`/roles/${id}`, { method: 'DELETE' })
    roles.value = roles.value.filter(r => r.id !== id)
  }

  const getRoleById = (id: string) => roles.value.find(r => r.id === id) ?? null

  // ── Config ──────────────────────────────────────────────────────────────────
  const updateConfig = async (data: Partial<AppConfig>) => {
    const res = await api('/config', { method: 'PUT', body: data })
    config.value = { ...config.value, ...res.data }
  }

  // ── Permission helpers (reads local state, no API call) ─────────────────────
  const hasPermission = (roleName: string, permission: PermissionKey): boolean => {
    const role = roles.value.find(r => r.name.toLowerCase() === roleName.toLowerCase())
    return role?.permissions[permission] ?? false
  }

  const getRolePermissions = (roleName: string): RolePermissions | undefined =>
    roles.value.find(r => r.name.toLowerCase() === roleName.toLowerCase())?.permissions

  const departmentNames = computed(() => departments.value.map(d => d.name).sort())

  return {
    departments, roles, config, loaded,
    ALL_PERMISSIONS,
    loadFromStorage,
    addDepartment, updateDepartment, deleteDepartment, getDepartmentById,
    addRole, updateRole, updateRolePermission, deleteRole, getRoleById,
    updateConfig, hasPermission, getRolePermissions,
    departmentNames
  }
})
