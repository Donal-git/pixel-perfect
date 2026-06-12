import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'

export interface Formation {
  id: string
  title: string
  description: string
  category: string
  duration: string
  level: 'débutant' | 'intermédiaire' | 'avancé'
  status: 'brouillon' | 'disponible' | 'en_cours' | 'terminée'
  departments: string[]
  start_date?: string
  end_date?: string
  created_at: string
  participants: number
}

export interface FormationRegistration {
  id: string
  formation_id: string
  employee_id: string
  registered_at: string
  status: 'inscrit' | 'en_cours' | 'complété'
  completion_date?: string
}

export const useFormationStore = defineStore('formation', () => {
  const config        = useRuntimeConfig()
  const formations    = ref<Formation[]>([])
  const registrations = ref<FormationRegistration[]>([])
  const loading       = ref(false)

  const headers = (): Record<string, string> => {
    const token = import.meta.client ? localStorage.getItem('auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const api = (path: string, opts: Record<string, any> = {}) =>
    $fetch<any>(`${config.public.apiBase}${path}`, { headers: headers(), ...opts })

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadFromStorage = async () => {
    if (!import.meta.client) return
    loading.value = true
    try {
      const res = await api('/formation')
      formations.value = res.data as Formation[]
    } catch (e) {
      console.error('Erreur chargement formations:', e)
    } finally {
      loading.value = false
    }
  }

  const loadRegistrationsFromStorage = async () => {
    if (!import.meta.client) return
    try {
      const authStore = useAuthStore()
      const employeeId = authStore.user?.id ?? ''
      const res = await api('/formation/my')
      const myFormations = res.data as Formation[]
      registrations.value = myFormations.map(f => ({
        id: `reg-${f.id}`,
        formation_id: f.id,
        employee_id: employeeId,
        registered_at: f.created_at,
        status: 'inscrit' as const
      }))
    } catch {
      // Endpoint non disponible pour ce rôle (admin/grh) — registrations vides
      registrations.value = []
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const createFormation = async (data: Omit<Formation, 'id' | 'created_at'>) => {
    const res = await api('/formation', { method: 'POST', body: data })
    const formation = res.data as Formation
    formations.value.unshift(formation)
    return formation
  }

  const updateFormation = async (id: string, data: Partial<Formation>) => {
    const res = await api(`/formation/${id}`, { method: 'PUT', body: data })
    const updated = res.data as Formation
    const idx = formations.value.findIndex(f => f.id === id)
    if (idx !== -1) formations.value[idx] = updated
    return updated
  }

  const publishFormation = async (id: string) => {
    const res = await api(`/formation/${id}`, { method: 'PUT', body: { status: 'disponible' } })
    const updated = res.data as Formation
    const idx = formations.value.findIndex(f => f.id === id)
    if (idx !== -1) formations.value[idx] = updated
    return updated
  }

  const deleteFormation = async (id: string) => {
    await api(`/formation/${id}`, { method: 'DELETE' })
    formations.value = formations.value.filter(f => f.id !== id)
  }

  const getFormationById = (id: string) =>
    formations.value.find(f => f.id === id) || null

  // ── Inscriptions ────────────────────────────────────────────────────────────
  const registerForFormation = async (formation_id: string, employee_id: string) => {
    const formation = formations.value.find(f => f.id === formation_id)
    if (formation?.end_date && new Date(formation.end_date) < new Date()) {
      throw new Error('Les inscriptions pour cette formation sont clôturées.')
    }
    const res = await api(`/formation/${formation_id}/register`, {
      method: 'POST',
      body: { employee_id }
    })
    const reg = res.data as FormationRegistration
    if (!reg.employee_id) reg.employee_id = employee_id
    registrations.value.push(reg)
    const f = formations.value.find(f => f.id === formation_id)
    if (f) f.participants++
    return reg
  }

  const unregisterFromFormation = async (formation_id: string, employee_id: string) => {
    await api(`/formation/${formation_id}/register`, {
      method: 'DELETE',
      body: { employee_id }
    })
    registrations.value = registrations.value.filter(
      r => !(r.formation_id === formation_id && r.employee_id === employee_id)
    )
    const f = formations.value.find(f => f.id === formation_id)
    if (f && f.participants > 0) f.participants--
  }

  const isEmployeeRegistered = (formation_id: string, employee_id: string) =>
    registrations.value.some(r => r.formation_id === formation_id && r.employee_id === employee_id)

  const getEmployeeFormations = async (_employee_id: string): Promise<Formation[]> => {
    const res = await api('/formation/my')
    return res.data as Formation[]
  }

  const getFormationRegistrations = async (formation_id: string): Promise<FormationRegistration[]> => {
    const res = await api(`/formation/${formation_id}/registrations`)
    return res.data as FormationRegistration[]
  }

  const updateRegistrationStatus = async (
    registration_id: string,
    status: 'inscrit' | 'en_cours' | 'complété'
  ) => {
    const res = await api(`/formation/registrations/${registration_id}/status`, {
      method: 'PATCH',
      body: { status }
    })
    const updated = res.data as FormationRegistration
    const idx = registrations.value.findIndex(r => r.id === registration_id)
    if (idx !== -1) registrations.value[idx] = updated
  }

  // ── Formations pour un département donné ──────────────────────────────────────
  const getFormationsForDepartment = (department?: string): Formation[] => {
    return formations.value.filter(f => {
      if (f.status !== 'disponible') return false
      if (!department) return false
      // Inclure si pour ce département, "Tous les départements", ou pas de restriction
      return f.departments.includes(department) || f.departments.includes('Tous les départements') || f.departments.length === 0
    })
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const availableFormations = computed(() => formations.value.filter(f => f.status === 'disponible'))
  const ongoingFormations   = computed(() => formations.value.filter(f => f.status === 'en_cours'))
  const draftFormations     = computed(() => formations.value.filter(f => f.status === 'brouillon'))

  const resetStore = () => {
    formations.value = []
    registrations.value = []
  }

  return {
    formations, registrations, loading,
    availableFormations, ongoingFormations, draftFormations,
    loadFromStorage, loadRegistrationsFromStorage,
    createFormation, updateFormation, publishFormation, deleteFormation, getFormationById,
    registerForFormation, unregisterFromFormation,
    isEmployeeRegistered, getEmployeeFormations,
    getFormationRegistrations, updateRegistrationStatus, getFormationsForDepartment,
    resetStore
  }
})
