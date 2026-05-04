import { defineStore } from 'pinia'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  managerId?: string
  employeeCount: number
  createdAt: string
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
  | 'survey_create'
  | 'survey_edit'
  | 'survey_delete'
  | 'survey_view_all'
  | 'personnel_create'
  | 'personnel_edit'
  | 'personnel_delete'
  | 'personnel_view_all'
  | 'formation_create'
  | 'formation_edit'
  | 'formation_delete'
  | 'formation_view_all'
  | 'reports_view'
  | 'settings_edit'
  | 'roles_edit'
  | 'departments_edit'

export interface RolePermissions {
  survey_create: boolean
  survey_edit: boolean
  survey_delete: boolean
  survey_view_all: boolean
  personnel_create: boolean
  personnel_edit: boolean
  personnel_delete: boolean
  personnel_view_all: boolean
  formation_create: boolean
  formation_edit: boolean
  formation_delete: boolean
  formation_view_all: boolean
  reports_view: boolean
  settings_edit: boolean
  roles_edit: boolean
  departments_edit: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: RolePermissions
  userCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENTS_STORAGE_KEY = 'appconfig_departments'
const ROLES_STORAGE_KEY = 'appconfig_roles'
const CONFIG_STORAGE_KEY = 'appconfig_settings'

const defaultDepartments: Department[] = [
  { id: 'd1', name: 'Direction', employeeCount: 3, createdAt: new Date().toISOString() },
  { id: 'd2', name: 'RH', employeeCount: 5, createdAt: new Date().toISOString() },
  { id: 'd3', name: 'Finance', employeeCount: 8, createdAt: new Date().toISOString() },
  { id: 'd4', name: 'IT', employeeCount: 12, createdAt: new Date().toISOString() },
  { id: 'd5', name: 'Commercial', employeeCount: 10, createdAt: new Date().toISOString() },
  { id: 'd6', name: 'Production', employeeCount: 15, createdAt: new Date().toISOString() },
  { id: 'd7', name: 'Marketing', employeeCount: 6, createdAt: new Date().toISOString() },
  { id: 'd8', name: 'Logistique', employeeCount: 4, createdAt: new Date().toISOString() }
]

const defaultRoles: Role[] = [
  {
    id: 'r1',
    name: 'Admin',
    description: 'Accès complet à toutes les fonctionnalités du système',
    permissions: {
      survey_create: true,
      survey_edit: true,
      survey_delete: true,
      survey_view_all: true,
      personnel_create: true,
      personnel_edit: true,
      personnel_delete: true,
      personnel_view_all: true,
      formation_create: true,
      formation_edit: true,
      formation_delete: true,
      formation_view_all: true,
      reports_view: true,
      settings_edit: true,
      roles_edit: true,
      departments_edit: true
    },
    userCount: 3
  },
  {
    id: 'r2',
    name: 'GRH',
    description: 'Gestion complète des ressources humaines',
    permissions: {
      survey_create: true,
      survey_edit: true,
      survey_delete: false,
      survey_view_all: true,
      personnel_create: false,
      personnel_edit: false,
      personnel_delete: false,
      personnel_view_all: true,
      formation_create: true,
      formation_edit: true,
      formation_delete: false,
      formation_view_all: true,
      reports_view: true,
      settings_edit: false,
      roles_edit: false,
      departments_edit: false
    },
    userCount: 12
  },
  {
    id: 'r3',
    name: 'Employé',
    description: 'Accès standard pour consultation et demandes personnelles',
    permissions: {
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
      formation_view_all: true,
      reports_view: false,
      settings_edit: false,
      roles_edit: false,
      departments_edit: false
    },
    userCount: 156
  }
]

const defaultConfig: AppConfig = {
  companyName: 'Entreprise RH',
  maxSurveysPerMonth: 10,
  allowAnonymousSurveys: true,
  requireEmailVerification: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5
}

const ALL_PERMISSIONS: { key: PermissionKey; label: string; description: string }[] = [
  // Sondages
  { key: 'survey_create', label: 'Créer un sondage', description: 'Peut créer de nouveaux sondages' },
  { key: 'survey_edit', label: 'Modifier un sondage', description: 'Peut modifier les sondages existants' },
  { key: 'survey_delete', label: 'Supprimer un sondage', description: 'Peut supprimer des sondages' },
  { key: 'survey_view_all', label: 'Voir tous les sondages', description: 'Peut voir tous les sondages (pas seulement les siens)' },
  // Personnel
  { key: 'personnel_create', label: 'Créer un membre du personnel', description: 'Peut ajouter de nouveaux membres' },
  { key: 'personnel_edit', label: 'Modifier un membre', description: 'Peut modifier les informations du personnel' },
  { key: 'personnel_delete', label: 'Supprimer un membre', description: 'Peut supprimer des membres du personnel' },
  { key: 'personnel_view_all', label: 'Voir tout le personnel', description: 'Peut voir la liste complète du personnel' },
  // Formations
  { key: 'formation_create', label: 'Créer une formation', description: 'Peut créer de nouvelles formations' },
  { key: 'formation_edit', label: 'Modifier une formation', description: 'Peut modifier les formations existantes' },
  { key: 'formation_delete', label: 'Supprimer une formation', description: 'Peut supprimer des formations' },
  { key: 'formation_view_all', label: 'Voir toutes les formations', description: 'Peut voir toutes les formations' },
  // Rapports
  { key: 'reports_view', label: 'Voir les rapports', description: 'Peut accéder aux rapports et statistiques' },
  // Paramètres
  { key: 'settings_edit', label: 'Modifier les paramètres', description: 'Peut modifier les paramètres généraux' },
  { key: 'roles_edit', label: 'Gérer les rôles', description: 'Peut modifier les rôles et permissions' },
  { key: 'departments_edit', label: 'Gérer les départements', description: 'Peut créer/modifier/supprimer des départements' }
]

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useAppConfigStore = defineStore('appConfig', () => {
  const departments = ref<Department[]>([])
  const roles = ref<Role[]>([])
  const config = ref<AppConfig>({ ...defaultConfig })
  const loaded = ref(false)

  // ── Load from localStorage ──────────────────────────────────────────────
  const loadFromStorage = () => {
    if (!process.client) return
    try {
      // Departments
      const savedDepts = localStorage.getItem(DEPARTMENTS_STORAGE_KEY)
      departments.value = savedDepts ? JSON.parse(savedDepts) : [...defaultDepartments]

      // Roles
      const savedRoles = localStorage.getItem(ROLES_STORAGE_KEY)
      roles.value = savedRoles ? JSON.parse(savedRoles) : [...defaultRoles]

      // Config
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (savedConfig) {
        config.value = { ...defaultConfig, ...JSON.parse(savedConfig) }
      } else {
        config.value = { ...defaultConfig }
      }

      loaded.value = true
    } catch {
      departments.value = [...defaultDepartments]
      roles.value = [...defaultRoles]
      config.value = { ...defaultConfig }
      loaded.value = true
    }
  }

  const saveDepartments = () => {
    if (!process.client) return
    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(departments.value))
  }

  const saveRoles = () => {
    if (!process.client) return
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles.value))
  }

  const saveConfig = () => {
    if (!process.client) return
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config.value))
  }

  // ── Departments CRUD ────────────────────────────────────────────────────
  const addDepartment = (name: string) => {
    const dept: Department = {
      id: crypto.randomUUID(),
      name,
      employeeCount: 0,
      createdAt: new Date().toISOString()
    }
    departments.value.push(dept)
    saveDepartments()
    return dept
  }

  const updateDepartment = (id: string, data: Partial<Department>) => {
    const idx = departments.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      departments.value[idx] = { ...departments.value[idx], ...data }
      saveDepartments()
    }
  }

  const deleteDepartment = (id: string) => {
    departments.value = departments.value.filter(d => d.id !== id)
    saveDepartments()
  }

  const getDepartmentById = (id: string) =>
    departments.value.find(d => d.id === id) ?? null

  // ── Roles CRUD ──────────────────────────────────────────────────────────
  const addRole = (name: string, description: string) => {
    const role: Role = {
      id: crypto.randomUUID(),
      name,
      description,
      permissions: {
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
      },
      userCount: 0
    }
    roles.value.push(role)
    saveRoles()
    return role
  }

  const updateRole = (id: string, data: Partial<Role>) => {
    const idx = roles.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      roles.value[idx] = { ...roles.value[idx], ...data }
      saveRoles()
    }
  }

  const updateRolePermission = (roleId: string, permission: PermissionKey, value: boolean) => {
    const role = roles.value.find(r => r.id === roleId)
    if (role) {
      role.permissions[permission] = value
      saveRoles()
    }
  }

  const deleteRole = (id: string) => {
    roles.value = roles.value.filter(r => r.id !== id)
    saveRoles()
  }

  const getRoleById = (id: string) =>
    roles.value.find(r => r.id === id) ?? null

  // ── Config ──────────────────────────────────────────────────────────────
  const updateConfig = (data: Partial<AppConfig>) => {
    config.value = { ...config.value, ...data }
    saveConfig()
  }

  // ── Permission helpers ──────────────────────────────────────────────────
  const hasPermission = (roleName: string, permission: PermissionKey): boolean => {
    const role = roles.value.find(r => r.name.toLowerCase() === roleName.toLowerCase())
    if (!role) return false
    return role.permissions[permission] ?? false
  }

  const getRolePermissions = (roleName: string): RolePermissions | undefined => {
    const role = roles.value.find(r => r.name.toLowerCase() === roleName.toLowerCase())
    return role?.permissions
  }

  // ── Computed ────────────────────────────────────────────────────────────
  const departmentNames = computed(() =>
    departments.value.map(d => d.name).sort()
  )

  return {
    // State
    departments,
    roles,
    config,
    loaded,
    ALL_PERMISSIONS,

    // Init
    loadFromStorage,

    // Departments
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentById,

    // Roles
    addRole,
    updateRole,
    updateRolePermission,
    deleteRole,
    getRoleById,

    // Config
    updateConfig,

    // Permissions
    hasPermission,
    getRolePermissions,

    // Computed
    departmentNames
  }
})