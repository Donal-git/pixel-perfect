<script setup lang="ts">
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  GraduationCap,
  Settings,
  Bell,
  FileText,
  UserPlus,
} from 'lucide-vue-next'
import type { FunctionalComponent } from 'vue'
import { useAuthStore } from '~/stores/auth'
import AppToast from '~/components/ui/AppToast.vue'

const authStore = useAuthStore()
const route = useRoute()

type Role = 'admin' | 'grh' | 'employee'
interface NavItem { label: string; href: string; icon: FunctionalComponent }

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
    { label: "Personnel", href: "/personnel", icon: Users },
    { label: "Demandes", href: "/admin/registration-requests", icon: UserPlus },
    { label: "Rapports", href: "/admin/reports", icon: FileText },
    { label: "Paramètres", href: "/admin/settings", icon: Settings },
  ],
  grh: [
    { label: "Tableau de bord", href: "/grh", icon: LayoutDashboard },
    { label: "Personnel", href: "/personnel", icon: Users },
    { label: "Sondages", href: "/grh/surveys", icon: ClipboardList },
    { label: "Formations", href: "/grh/formations", icon: GraduationCap },
  ],
  employee: [
    { label: "Tableau de bord", href: "/employee", icon: LayoutDashboard },
    // { label: "Mes sondages", href: "/surveys", icon: ClipboardList },
  ],
}

const navItems = computed(() => {
  const role = authStore.role as Role | null
  if (!role || !(role in navByRole)) return navByRole.admin
  return navByRole[role]
})

const handleSignOut = async () => {
  await authStore.logout()
}

const currentLabel = computed(() => {
  const item = navItems.value.find((item: NavItem) =>
    route.path === item.href ||
    (item.href.split('/').length > 2 && route.path.startsWith(item.href))
  )
  return item?.label || "Tableau de bord"
})
</script>

<template>
  <div class="flex min-h-screen overflow-x-hidden">
    <!-- Sidebar -->
    <aside class="hidden w-64 flex-col border-r bg-gray-100 lg:flex">
      <div class="flex h-16 items-center justify-between border-b px-6">
        <img src="/logo.png" alt="EchoRH" class="h-8 w-auto object-contain" />
        <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700">
          {{ authStore.role }}
        </span>
      </div>

      <nav class="flex-1 space-y-1 p-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="(route.path === item.href || (item.href.split('/').length > 2 && route.path.startsWith(item.href)))
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:bg-gray-200'"
        >
          <component :is="item.icon" class="h-5 w-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- User section -->
      <div class="border-t p-4">
        <div class="mb-3 flex items-center gap-3 px-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold">
            {{ authStore.user?.email?.[0]?.toUpperCase() || "U" }}
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              {{ authStore.user?.email }}
            </p>
          </div>
        </div>

        <button
          class="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded"
          @click="handleSignOut"
        >
          <LogOut class="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <header class="flex h-16 items-center justify-between border-b px-4 lg:px-8">
        <div class="flex items-center lg:hidden">
          <img src="/logo.png" alt="EchoRH" class="h-8 w-auto object-contain" />
        </div>

        <div class="hidden lg:block">
          <h2 class="text-lg font-semibold">
            {{ currentLabel }}
          </h2>
        </div>

        <div class="flex items-center gap-2">
          <button class="relative">
            <Bell class="h-5 w-5" />
          </button>

          <button class="lg:hidden" @click="handleSignOut">
            <LogOut class="h-5 w-5" />
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>

  <!-- Notifications toast -->
  <AppToast />
</template>