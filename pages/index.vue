
<script setup lang="ts">
const user = ref(null)
const role = ref('')
const loading = ref(true)

onMounted(async () => {
  // Exemple fake (à remplacer par Pinia / Supabase / API)
  user.value = { id: 1 }
  role.value = 'admin' // admin | grh | employee

  loading.value = false
})

watchEffect(() => {
  // pas connecté → login
  if (!loading.value && !user.value) {
    navigateTo('/auth')
    return
  }

  // connecté → redirection selon rôle
  if (!loading.value && user.value) {
    switch (role.value) {
      case 'admin':
        navigateTo('/admin')
        break

      case 'grh':
        navigateTo('/grh')
        break

      case 'employee':
        navigateTo('/employee')
        break

      default:
        navigateTo('/auth')
    }
  }
})
</script>

<template>
  <div
    v-if="loading"
    class="flex min-h-screen items-center justify-center"
  >
    Chargement...
  </div>
</template>