/**
 * HTTP client composable for the RH backend.
 * Automatically injects the JWT auth token and handles 401 redirects.
 * Usage inside stores (setup context): const api = useApi()
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  const getHeaders = (): Record<string, string> => {
    if (!import.meta.client) return {}
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handle401 = () => {
    if (!import.meta.client) return
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    navigateTo('/auth')
  }

  const request = async <T = any>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> => {
    try {
      return await $fetch<T>(path, {
        baseURL,
        headers: { ...getHeaders(), ...(options.headers as Record<string, string> || {}) },
        ...options
      })
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.status === 401) {
        handle401()
      }
      throw err
    }
  }

  return {
    get:    <T = any>(path: string, query?: Record<string, any>) =>
      request<T>(path, { method: 'GET', params: query }),

    post:   <T = any>(path: string, body?: any) =>
      request<T>(path, { method: 'POST', body }),

    put:    <T = any>(path: string, body?: any) =>
      request<T>(path, { method: 'PUT', body }),

    patch:  <T = any>(path: string, body?: any) =>
      request<T>(path, { method: 'PATCH', body }),

    delete: <T = any>(path: string) =>
      request<T>(path, { method: 'DELETE' })
  }
}
