<!-- <script setup lang="ts">
import { computed } from 'vue'

// 👉 Remplace par ton vrai store Pinia
// ex: const authStore = useAuthStore()
const user = ref(null)
const role = ref('')
const loading = ref(true)

// composants
import AdminDashboard from '@/components/admin/AdminDashboard.vue'
import GRHDashboard from '@/components/grh/GRHDashboard.vue'
import EmployeeDashboard from '@/components/employee/EmployeeDashboard.vue'
// import AppLayout from '@/components/AppLayout.vue'

// 👉 Simulation (à remplacer par ton auth réel)
onMounted(async () => {
  // exemple avec supabase ou store
  // const { data } = await supabase.auth.getUser()
  // user.value = data.user

  // fake test
  user.value = { id: 1 }
  role.value = 'admin' // change pour tester: 'grh' | 'employee'
  loading.value = false
})

// 🔁 Redirection si pas connecté
watchEffect(() => {
  if (!loading.value && !user.value) {
    navigateTo('/auth')
  }
})

// 🎯 Choix du dashboard selon le rôle
const DashboardComponent = computed(() => {
  if (role.value === 'admin') return AdminDashboard
  if (role.value === 'grh') return GRHDashboard
  if (role.value === 'employee') return EmployeeDashboard
  return 'auth' 
})
</script> -->

<!-- <template>
  
  <div v-if="loading" class="flex min-h-screen items-center justify-center bg-background">
    <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>

  
  <AppLayout v-else>
    <component :is="DashboardComponent" />
  </AppLayout>
</template> -->



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