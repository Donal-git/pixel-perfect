import { defineStore } from 'pinia'

export interface Formation {
  id: string
  title: string
  description: string
  category: string
  duration: string
  level: 'débutant' | 'intermédiaire' | 'avancé'
  status: 'disponible' | 'en_cours' | 'terminée'
  departments: string[]
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

  // ── Load formations from API ────────────────────────────────────────────────
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
      // Registrations are loaded on-demand via getFormationRegistrations
      registrations.value = []
    } catch (e) {
      console.error('Erreur chargement inscriptions:', e)
    }
  }

  // ── CRUD formations ─────────────────────────────────────────────────────────
  const createFormation = async (data: Omit<Formation, 'id' | 'created_at'>) => {
    const res = await api('/formations', { method: 'POST', body: data })
    const formation = res.data as Formation
    formations.value.unshift(formation)
    return formation
  }

  const updateFormation = async (id: string, data: Partial<Formation>) => {
    const res = await api(`/formation/${id}`, { method: 'PUT', body: data })
    const updated = res.data as Formation
    const idx = formations.value.findIndex(f => f.id === id)
    if (idx !== -1) formations.value[idx] = updated
  }

  const deleteFormation = async (id: string) => {
    await api(`/formation/${id}`, { method: 'DELETE' })
    formations.value = formations.value.filter(f => f.id !== id)
  }

  const getFormationById = (id: string) =>
    formations.value.find(f => f.id === id) || null

  // ── Registration management ─────────────────────────────────────────────────
  const registerForFormation = async (formation_id: string, _employee_id: string) => {
    const res = await api(`/formation/${formation_id}/register`, { method: 'POST' })
    const reg = res.data as FormationRegistration
    registrations.value.push(reg)
    // Increment local participant count
    const f = formations.value.find(f => f.id === formation_id)
    if (f) f.participants++
    return reg
  }

  const unregisterFromFormation = async (formation_id: string, _employee_id: string) => {
    await api(`/formation/${formation_id}/register`, { method: 'DELETE' })
    registrations.value = registrations.value.filter(r => r.formation_id !== formation_id)
    const f = formations.value.find(f => f.id === formation_id)
    if (f && f.participants > 0) f.participants--
  }

  const isEmployeeRegistered = (formation_id: string, _employee_id: string) =>
    registrations.value.some(r => r.formation_id === formation_id)

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

  const availableFormations = computed(() => formations.value.filter(f => f.status === 'disponible'))
  const ongoingFormations   = computed(() => formations.value.filter(f => f.status === 'en_cours'))

  return {
    formations, registrations, loading,
    availableFormations, ongoingFormations,
    loadFromStorage, loadRegistrationsFromStorage,
    createFormation, updateFormation, deleteFormation, getFormationById,
    registerForFormation, unregisterFromFormation,
    isEmployeeRegistered, getEmployeeFormations,
    getFormationRegistrations, updateRegistrationStatus
  }
})
