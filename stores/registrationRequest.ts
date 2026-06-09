import { defineStore } from 'pinia'

export interface RegistrationRequest {
  id: string
  fullName: string
  email: string
  phone?: string
  department: string
  position: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

export const useRegistrationRequestStore = defineStore('registrationRequest', () => {
  const config   = useRuntimeConfig()
  const requests = ref<RegistrationRequest[]>([])
  const loading  = ref(false)

  const authHeaders = (): Record<string, string> => {
    const token = import.meta.client ? localStorage.getItem('auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const api = (path: string, opts: Record<string, any> = {}) =>
    $fetch<any>(`${config.public.apiBase}${path}`, { headers: authHeaders(), ...opts })

  // ── Public — soumettre une demande (sans authentification) ──────────────────
  const submit = async (data: {
    fullName: string
    email: string
    phone?: string
    department: string
    position: string
  }): Promise<RegistrationRequest> => {
    const res = await $fetch<any>(`${config.public.apiBase}/registration-requests`, {
      method: 'POST',
      body: data
    })
    return res.data as RegistrationRequest
  }

  // ── Admin/GRH — lister les demandes ────────────────────────────────────────
  const fetchRequests = async (status?: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    loading.value = true
    try {
      const qs = status ? `?status=${status}` : ''
      const res = await api(`/registration-requests${qs}`)
      requests.value = res.data as RegistrationRequest[]
    } catch (e) {
      console.error('Erreur chargement demandes:', e)
      requests.value = []
    } finally {
      loading.value = false
    }
  }

  // ── Admin — approuver ───────────────────────────────────────────────────────
  const approve = async (id: string): Promise<RegistrationRequest> => {
    const res = await api(`/registration-requests/${id}/approve`, { method: 'PATCH' })
    const updated = res.data as RegistrationRequest
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx !== -1) requests.value[idx] = updated
    return updated
  }

  // ── Admin — rejeter ─────────────────────────────────────────────────────────
  const reject = async (id: string): Promise<RegistrationRequest> => {
    const res = await api(`/registration-requests/${id}/reject`, { method: 'PATCH' })
    const updated = res.data as RegistrationRequest
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx !== -1) requests.value[idx] = updated
    return updated
  }

  const pendingCount = computed(() => requests.value.filter(r => r.status === 'PENDING').length)

  return {
    requests, loading, pendingCount,
    submit, fetchRequests, approve, reject
  }
})
