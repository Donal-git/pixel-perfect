import { defineStore } from 'pinia'

export interface PersonnelMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'grh' | 'employee'
  department: string
  position: string
  phone: string
  status: 'actif' | 'inactif'
  registeredAt: string
  password?: string
}

export const usePersonnelStore = defineStore('personnel', () => {
  const config  = useRuntimeConfig()
  const members = ref<PersonnelMember[]>([])
  const loading = ref(false)

  // ── Token header ────────────────────────────────────────────────────────────
  const headers = (): Record<string, string> => {
    const token = import.meta.client ? localStorage.getItem('auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const api = (path: string, opts: Record<string, any> = {}) =>
    $fetch<any>(`${config.public.apiBase}${path}`, { headers: headers(), ...opts })

  // ── Load all members from API ───────────────────────────────────────────────
  const normalizeMember = (raw: any): PersonnelMember => ({
    id: raw.id ?? raw._id,
    name: raw.name ?? raw.username ?? raw.fullName ?? '',
    email: raw.email ?? '',
    role: raw.role ?? 'employee',
    department: raw.department ?? raw.dept ?? '',
    position: raw.position ?? raw.jobTitle ?? '',
    phone: raw.phone ?? raw.tel ?? '',
    status: raw.status ?? 'actif',
    registeredAt: raw.registeredAt ?? raw.createdAt ?? raw.created_at ?? ''
  })

  const loadFromStorage = async () => {
    if (!import.meta.client) return
    loading.value = true
    try {
      const res = await api('/users', { params: { limit: 200 } })
      members.value = (res.data as any[]).map(normalizeMember)
    } catch (e) {
      console.error('Erreur chargement personnel:', e)
    } finally {
      loading.value = false
    }
  }

  // ── Create member ───────────────────────────────────────────────────────────
  const addMember = async (data: Omit<PersonnelMember, 'id' | 'registeredAt'>) => {
    const res = await api('/users/register', { method: 'POST', body: data })
    const member = res.user as PersonnelMember
    members.value.unshift(member)
    return member
  }

  // ── Update member ───────────────────────────────────────────────────────────
  const updateMember = async (id: string, data: Partial<PersonnelMember>) => {
    const res = await api(`/users/${id}`, { method: 'PUT', body: data })
    const updated = res.data as PersonnelMember
    const idx = members.value.findIndex(m => m.id === id)
    if (idx !== -1) members.value[idx] = updated
  }

  // ── Delete member ───────────────────────────────────────────────────────────
  const deleteMember = async (id: string) => {
    await api(`/users/${id}`, { method: 'DELETE' })
    members.value = members.value.filter(m => m.id !== id)
  }

  // ── Toggle status ───────────────────────────────────────────────────────────
  const toggleStatus = async (id: string) => {
    const res = await api(`/users/${id}/status`, { method: 'PATCH' })
    const updated = res.data as PersonnelMember
    const idx = members.value.findIndex(m => m.id === id)
    if (idx !== -1) members.value[idx] = updated
  }

  // ── Getters ─────────────────────────────────────────────────────────────────
  const getMemberById    = (id: string) => members.value.find(m => m.id === id) ?? null
  const getPersonnelById = (id: string) => getMemberById(id)

  const updatePersonnel = async (id: string, data: Partial<PersonnelMember>) =>
    updateMember(id, data)

  const byDepartment = computed(() => {
    const map: Record<string, number> = {}
    for (const m of members.value) {
      map[m.department] = (map[m.department] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count)
  })

  return {
    members,
    loading,
    byDepartment,
    loadFromStorage,
    addMember,
    updateMember,
    deleteMember,
    toggleStatus,
    getMemberById,
    getPersonnelById,
    updatePersonnel
  }
})
