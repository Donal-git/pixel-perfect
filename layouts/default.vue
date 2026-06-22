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

const isActive = (href: string) =>
  route.path === href || (href.split('/').length > 2 && route.path.startsWith(href))
</script>

<template>
  <div class="flex min-h-screen overflow-x-hidden bg-slate-50">

    <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
    <aside class="hidden w-60 flex-col bg-slate-900 lg:flex">

      <!-- Logo -->
      <div class="flex h-16 items-center border-b border-slate-700/50 px-5">
        <div class="rounded-lg bg-white px-2.5 py-1">
          <img src="/logo.png" alt="EchoRH" class="h-6 w-auto object-contain" />
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-0.5 px-3 py-5">
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="isActive(item.href)
            ? 'bg-teal-500/10 text-teal-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>

    </aside>

    <!-- ── Main ─────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 flex-col min-w-0">

      <!-- Header -->
      <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8 shadow-sm">
        <div class="flex items-center lg:hidden">
          <img src="/logo.png" alt="EchoRH" class="h-8 w-auto object-contain" />
        </div>

        <div class="hidden lg:block">
          <h2 class="text-sm font-semibold text-slate-900">{{ currentLabel }}</h2>
        </div>

        <div class="flex items-center gap-3">
          <!-- Bell -->
          <button class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100">
            <Bell class="h-4 w-4" />
          </button>

          <!-- User info + logout (desktop) -->
          <div class="hidden lg:flex items-center gap-3 border-l border-slate-200 pl-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-600">
              {{ authStore.user?.email?.[0]?.toUpperCase() || 'U' }}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="truncate text-xs font-medium text-slate-700 max-w-[160px]">{{ authStore.user?.email }}</span>
              <span class="text-[11px] capitalize text-slate-400">{{ authStore.role }}</span>
            </div>
            <button
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
              title="Déconnexion"
              @click="handleSignOut"
            >
              <LogOut class="h-4 w-4" />
            </button>
          </div>

          <!-- Logout mobile only -->
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
            @click="handleSignOut"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>

  <AppToast />
</template>
