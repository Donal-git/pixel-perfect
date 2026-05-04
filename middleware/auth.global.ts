import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // Attendre que l'authentification soit initialisée
  if (auth.loading) {
    await auth.fetchUser()
  }

  const isAuthPage = to.path === '/auth'

  // Utilisateur non authentifié → redirect vers /auth
  if (!auth.isAuthenticated && !isAuthPage) {
    return navigateTo('/auth')
  }

  // Utilisateur authentifié sur page /auth → redirect vers dashboard
  if (auth.isAuthenticated && isAuthPage) {
    switch (auth.role) {
      case 'admin':
        return navigateTo('/admin')
      case 'grh':
        return navigateTo('/grh')
      case 'employee':
        return navigateTo('/employee')
      default:
        return navigateTo('/auth')
    }
  }

  // Protection par rôle
  const role = auth.role

  if (to.path.startsWith('/admin') && role !== 'admin') {
    return navigateTo('/auth')
  }

  if (to.path.startsWith('/grh') && role !== 'grh' && role !== 'admin') {
    return navigateTo('/auth')
  }

  if (to.path.startsWith('/employee') && role !== 'employee' && role !== 'admin') {
    return navigateTo('/auth')
  }
})