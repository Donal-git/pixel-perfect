
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const session = ref<any>(null)
  const role = ref<string | null>(null)
  const loading = ref(true) // ✅ important: true au départ

  /**
   * 🔹 Comptes temporaires de test
   */
  const fakeUsers = [
    {
      id: 1,
      name: 'Admin Principal',
      email: 'admin@test.com',
      password: 'admin123',
      accountType: 'admin'
    },
    {
      id: 2,
      name: 'Responsable GRH',
      email: 'grh@test.com',
      password: 'grh123',
      accountType: 'grh'
    },
    {
      id: 3,
      name: 'Employé Standard',
      email: 'employee@test.com',
      password: 'employee123',
      accountType: 'employee'
    }
  ]

  /**
   * 🔹 Récupération user localStorage SAFE
   */
  const fetchUser = async () => {
    loading.value = true

    try {
      if (import.meta.client) {
        const savedUser = localStorage.getItem('auth_user')

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser)

          user.value = parsedUser
          role.value = parsedUser.accountType || null
        } else {
          user.value = null
          role.value = null
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      user.value = null
      role.value = null
      if (import.meta.client) {
        localStorage.removeItem('auth_user')
      }
    } finally {
      loading.value = false // ✅ TOUJOURS terminé
    }
  }

  /**
   * 🔹 Initialisation auth (IMPORTANT pour Nuxt)
   */
  const initAuth = async () => {
    await fetchUser()
  }

  /**
   * 🔹 Login
   */
  const login = async (email: string, password: string) => {
    loading.value = true

    try {
      const foundUser = fakeUsers.find(
        (u) =>
          u.email === email.trim() &&
          u.password === password.trim()
      )

      if (!foundUser) {
        throw new Error('Email ou mot de passe incorrect')
      }

      const userWithoutPassword = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        accountType: foundUser.accountType
      }

      user.value = userWithoutPassword
      role.value = foundUser.accountType
      session.value = {
        loggedIn: true,
        loginAt: new Date().toISOString()
      }

      if (import.meta.client) {
        localStorage.setItem('auth_user', JSON.stringify(userWithoutPassword))
      }

      switch (foundUser.accountType) {
        case 'admin':
          await navigateTo('/admin')
          break
        case 'grh':
          await navigateTo('/grh')
          break
        case 'employee':
          await navigateTo('/employee')
          break
        default:
          await navigateTo('/auth')
      }

      return { success: true, message: 'Connexion réussie' }

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erreur de connexion'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 🔹 Logout
   */
  const logout = async () => {
    user.value = null
    session.value = null
    role.value = null

    if (import.meta.client) {
      localStorage.removeItem('auth_user')
    }

    await navigateTo('/auth')
  }

  const isAuthenticated = computed(() => !!user.value)

  return {
    user,
    session,
    role,
    loading,
    isAuthenticated,

    login,
    logout,
    fetchUser,
    initAuth
  }
})