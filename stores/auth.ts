import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref<any>(null)
  const session = ref<any>(null)
  const role    = ref<string | null>(null)
  const loading = ref(true)

  // ── Token helpers ───────────────────────────────────────────────────────────
  const saveToken  = (t: string) => { if (import.meta.client) localStorage.setItem('auth_token', t) }
  const clearToken = ()          => { if (import.meta.client) localStorage.removeItem('auth_token') }

  // ── Restore session from localStorage (no API call needed) ──────────────────
  const fetchUser = async () => {
    loading.value = true
    try {
      if (import.meta.client) {
        const saved = localStorage.getItem('auth_user')
        if (saved) {
          const parsed = JSON.parse(saved)
          user.value  = parsed
          role.value  = parsed.accountType ?? parsed.role ?? null
        } else {
          user.value = null
          role.value = null
        }
      }
    } catch {
      user.value = null
      role.value = null
      if (import.meta.client) {
        localStorage.removeItem('auth_user')
        clearToken()
      }
    } finally {
      loading.value = false
    }
  }

  const initAuth = async () => { await fetchUser() }

  // ── Login via real API ──────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    loading.value = true
    try {
      const config = useRuntimeConfig()
      const res = await $fetch<{ token: string; data: any }>(
        `${config.public.apiBase}/users/login`, 
        { method: 'POST', 
          body: { email: email.trim(), 
            password: password.trim() 
          } 
        }
      )
      
      

      const { token, data: apiUser } = res

      if (!apiUser) {
      throw new Error("Utilisateur ou données invalides")
    }
      // Normalize: backend returns { id, name, email, role, ... }
      const normalized = {
        id:          apiUser.id ?? apiUser._id,
        name:        apiUser.username ?? apiUser.name,
        email:       apiUser.email,
        accountType: apiUser.role   // frontend uses 'accountType'
      }

      user.value    = normalized
      role.value    = normalized.accountType
      session.value = { loggedIn: true, loginAt: new Date().toISOString() }

      saveToken(token)
      if (import.meta.client) {
        localStorage.setItem('auth_user', JSON.stringify(normalized))
      }

      switch (normalized.accountType) {
        case 'admin':    await navigateTo('/admin');    break
        case 'grh':      await navigateTo('/grh');      break
        case 'employee': await navigateTo('/employee'); break
        default:         await navigateTo('/auth')
      }

      return { success: true, message: 'Connexion réussie' }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Erreur de connexion'
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    user.value    = null
    session.value = null
    role.value    = null
    clearToken()
    if (import.meta.client) {
      localStorage.removeItem('auth_user')
    }
    await navigateTo('/auth')
  }

  const isAuthenticated = computed(() => !!user.value)

  return { user, session, role, loading, isAuthenticated, login, logout, fetchUser, initAuth }
})
