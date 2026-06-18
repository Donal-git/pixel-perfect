
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.fetchUser()
})

watchEffect(() => {
  if (authStore.loading) return

  if (!authStore.user) {
    navigateTo('/auth/login')
    return
  }

  switch (authStore.role) {
    case 'admin':    navigateTo('/admin');    break
    case 'grh':      navigateTo('/grh');      break
    case 'employee': navigateTo('/employee'); break
    default:         navigateTo('/auth/login')
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
  </div>
</template>
