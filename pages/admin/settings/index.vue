<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  User,
  Settings,
  Building2,
  Shield,
  Bell,
  Lock,
  Mail,
  Globe,
  Clock,
  Save,
  FileText,
  GraduationCap,
  Users,
  ChevronRight
} from 'lucide-vue-next'
import { useAppConfigStore } from '~/stores/appConfig'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

const appConfigStore = useAppConfigStore()
const authStore = useAuthStore()
const toast = useToast()

onMounted(() => {
  appConfigStore.loadFromStorage()
})

// ── Navigation cards ────────────────────────────────────────────────────────
const settingsCards = [
  {
    title: 'Profil Admin',
    description: 'Gérez vos informations personnelles',
    href: '/admin/settings/profile',
    icon: User,
    color: 'blue',
    bg: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Rôles & Permissions',
    description: 'Configurez les accès utilisateurs',
    href: '/admin/settings/roles',
    icon: Shield,
    color: 'purple',
    bg: 'from-purple-50 to-pink-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    title: 'Départements',
    description: 'Gérez les départements entreprise',
    href: '/admin/settings/departments',
    icon: Building2,
    color: 'emerald',
    bg: 'from-emerald-50 to-green-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  },
  {
    title: 'Rapports',
    description: 'Synthèse sondages et formations',
    href: '/admin/reports',
    icon: FileText,
    color: 'amber',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600'
  }
]

// ── Paramètres généraux ─────────────────────────────────────────────────────
const generalSettings = reactive({
  companyName: '',
  maxSurveysPerMonth: 10,
  allowAnonymousSurveys: true,
  requireEmailVerification: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5
})

const loading = ref(false)

// Charger les paramètres depuis le store
const loadSettings = () => {
  const config = appConfigStore.config
  generalSettings.companyName = config.companyName
  generalSettings.maxSurveysPerMonth = config.maxSurveysPerMonth
  generalSettings.allowAnonymousSurveys = config.allowAnonymousSurveys
  generalSettings.requireEmailVerification = config.requireEmailVerification
  generalSettings.sessionTimeout = config.sessionTimeout
  generalSettings.maxLoginAttempts = config.maxLoginAttempts
}

onMounted(() => {
  loadSettings()
})

// ── Sauvegarde ──────────────────────────────────────────────────────────────
const saveSettings = async () => {
  loading.value = true

  await new Promise(r => setTimeout(r, 500))

  appConfigStore.updateConfig({
    companyName: generalSettings.companyName,
    maxSurveysPerMonth: generalSettings.maxSurveysPerMonth,
    allowAnonymousSurveys: generalSettings.allowAnonymousSurveys,
    requireEmailVerification: generalSettings.requireEmailVerification,
    sessionTimeout: generalSettings.sessionTimeout,
    maxLoginAttempts: generalSettings.maxLoginAttempts
  })

  loading.value = false
  toast.success('Paramètres enregistrés', 'Les modifications ont été appliquées')
}

// ── Statistiques ────────────────────────────────────────────────────────────
const stats = computed(() => ({
  departments: appConfigStore.departments.length,
  roles: appConfigStore.roles.length,
  users: authStore.user ? 1 : 0
}))

// ── Admin info ──────────────────────────────────────────────────────────────
const adminInfo = computed(() => ({
  name: authStore.user?.name || 'Admin Principal',
  email: authStore.user?.email || 'admin@test.com',
  role: 'Administrateur'
}))
</script>

<template>
  <div class="space-y-8">

    <!-- Header ─────────────────────────────────────────────────────────────── -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900">
        Paramètres
      </h1>
      <p class="mt-2 text-lg text-gray-600">
        Gérez la configuration de votre espace administrateur
      </p>
    </div>

    <!-- Stats rapides ──────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Building2 class="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.departments }}</p>
            <p class="text-xs text-gray-500">Départements</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Shield class="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.roles }}</p>
            <p class="text-xs text-gray-500">Rôles</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users class="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ adminInfo.name }}</p>
            <p class="text-xs text-gray-500">Connecté</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation cards ───────────────────────────────────────────────────── -->
    <div>
      <h2 class="text-xl font-bold text-gray-900 mb-4">Sections</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <NuxtLink
          v-for="card in settingsCards"
          :key="card.href"
          :to="card.href"
          class="group block p-6 bg-white border-2 border-dashed rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-solid hover:-translate-y-1"
          :class="card.border"
        >
          <div :class="`bg-gradient-to-r ${card.bg} rounded-xl p-6`">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  :class="card.iconBg"
                >
                  <component :is="card.icon" class="h-6 w-6" :class="card.iconColor" />
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-1">
                  {{ card.title }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ card.description }}
                </p>
              </div>
              <ChevronRight class="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Paramètres généraux ────────────────────────────────────────────────── -->
    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div class="border-b px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Settings class="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Paramètres généraux</h2>
            <p class="text-xs text-gray-500">Configuration globale de l'application</p>
          </div>
        </div>
      </div>

      <div class="p-6 space-y-6">
        <!-- Nom de l'entreprise -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <div class="flex items-center gap-2">
                <Globe class="h-4 w-4 text-gray-400" />
                Nom de l'entreprise
              </div>
            </label>
            <input
              v-model="generalSettings.companyName"
              type="text"
              placeholder="Entreprise RH"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <!-- Sondages -->
        <div class="border-t pt-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText class="h-4 w-4" />
            Paramètres des sondages
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Sondages maximum par mois
              </label>
              <input
                v-model.number="generalSettings.maxSurveysPerMonth"
                type="number"
                min="1"
                max="100"
                class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div class="flex items-center">
              <label class="flex items-center gap-3 cursor-pointer">
                <div class="relative">
                  <input
                    v-model="generalSettings.allowAnonymousSurveys"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                  <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span class="text-sm text-gray-700">Autoriser les sondages anonymes</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Sécurité -->
        <div class="border-t pt-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Lock class="h-4 w-4" />
            Sécurité
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <div class="flex items-center gap-2">
                  <Clock class="h-4 w-4 text-gray-400" />
                  Timeout de session (minutes)
                </div>
              </label>
              <input
                v-model.number="generalSettings.sessionTimeout"
                type="number"
                min="5"
                max="120"
                class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tentatives de connexion maximum
              </label>
              <input
                v-model.number="generalSettings.maxLoginAttempts"
                type="number"
                min="3"
                max="10"
                class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div class="flex items-center md:col-span-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <div class="relative">
                  <input
                    v-model="generalSettings.requireEmailVerification"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                  <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span class="text-sm text-gray-700">Exiger la vérification email</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t px-6 py-4 bg-gray-50">
        <button
          @click="saveSettings"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Save class="h-4 w-4" />
          {{ loading ? 'Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
      </div>
    </div>

  </div>
</template>