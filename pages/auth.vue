<script setup lang="ts">
definePageMeta({ layout: false })

import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRegistrationRequestStore } from '~/stores/registrationRequest'
import { ArrowLeft, Send, LogIn, UserPlus } from 'lucide-vue-next'

const authStore = useAuthStore()
const requestStore = useRegistrationRequestStore()

// ── Vue active : 'login' | 'request' | 'success' ────────────────────────────
const view = ref<'login' | 'request' | 'success'>('login')

// ── Connexion ────────────────────────────────────────────────────────────────
const email    = ref('')
const password = ref('')
const loginLoading = ref(false)
const loginError   = ref('')

const handleLogin = async () => {
  loginError.value = ''
  loginLoading.value = true
  const result = await authStore.login(email.value, password.value)
  if (!result.success) {
    loginError.value = result.message || 'Email ou mot de passe incorrect'
  }
  loginLoading.value = false
}

// ── Demande de compte ────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Direction',
  'Ressources Humaines',
  'Finance & Comptabilité',
  'Informatique',
  'Commercial & Vente',
  'Marketing & Communication',
  'Juridique',
  'Logistique & Supply Chain',
]

const form = ref({
  fullName:   '',
  email:      '',
  phone:      '',
  department: '',
  position:   '',
})
const requestLoading = ref(false)
const requestError   = ref('')

const handleRequest = async () => {
  requestError.value = ''
  if (!form.value.fullName.trim() || !form.value.email.trim() ||
      !form.value.department || !form.value.position.trim()) {
    requestError.value = 'Veuillez remplir tous les champs obligatoires.'
    return
  }

  requestLoading.value = true
  try {
    await requestStore.submit({
      fullName:   form.value.fullName.trim(),
      email:      form.value.email.trim(),
      phone:      form.value.phone.trim() || undefined,
      department: form.value.department,
      position:   form.value.position.trim(),
    })
    view.value = 'success'
  } catch (e: any) {
    requestError.value = e?.data?.message || 'Une erreur est survenue. Veuillez réessayer.'
  } finally {
    requestLoading.value = false
  }
}

const resetRequest = () => {
  form.value = { fullName: '', email: '', phone: '', department: '', position: '' }
  requestError.value = ''
  view.value = 'login'
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <div class="w-full max-w-md">

      <!-- Card -->
      <div class="rounded-2xl bg-white shadow-xl overflow-hidden">

        <!-- Logo commun -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-8 text-center">
          <div class="mx-auto mb-4 flex items-center justify-center">
            <div class="rounded-2xl bg-white px-5 py-3 shadow-lg">
              <img src="/logo.png" alt="EchoRH" class="h-12 w-auto object-contain" />
            </div>
          </div>
          <p class="text-sm text-white/70">Gestion RH moderne & intuitive</p>
        </div>

        <!-- ── VUE CONNEXION ───────────────────────────────────────────── -->
        <div v-if="view === 'login'" class="px-8 py-8 space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900">Connexion</h2>
            <p class="mt-1 text-sm text-gray-500">Accédez à votre espace RH</p>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="votre@email.com"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <p v-if="loginError" class="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {{ loginError }}
            </p>

            <button
              type="submit"
              :disabled="loginLoading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
            >
              <span v-if="loginLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <LogIn v-else class="h-4 w-4" />
              {{ loginLoading ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>

          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-100" /></div>
            <div class="relative text-center"><span class="bg-white px-3 text-xs text-gray-400">ou</span></div>
          </div>

          <button
            @click="view = 'request'"
            class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <UserPlus class="h-4 w-4" />
            Demander un compte
          </button>
        </div>

        <!-- ── VUE FORMULAIRE DEMANDE ───────────────────────────────────── -->
        <div v-else-if="view === 'request'" class="px-8 py-8 space-y-5">
          <div class="flex items-center gap-3">
            <button
              @click="view = 'login'"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            >
              <ArrowLeft class="h-4 w-4" />
            </button>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Demander un compte</h2>
              <p class="text-xs text-gray-500">Votre demande sera examinée par un administrateur</p>
            </div>
          </div>

          <form @submit.prevent="handleRequest" class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Nom complet <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.fullName"
                type="text"
                required
                placeholder="Jean Dupont"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Email professionnel <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="jean.dupont@entreprise.com"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+33 6 00 00 00 00"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Département <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.department"
                required
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="" disabled>Sélectionner un département</option>
                <option v-for="dept in DEPARTMENTS" :key="dept" :value="dept">{{ dept }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Poste <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.position"
                type="text"
                required
                placeholder="Développeur, Comptable…"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <p v-if="requestError" class="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {{ requestError }}
            </p>

            <button
              type="submit"
              :disabled="requestLoading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
            >
              <span v-if="requestLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <Send v-else class="h-4 w-4" />
              {{ requestLoading ? 'Envoi en cours…' : 'Envoyer la demande' }}
            </button>
          </form>
        </div>

        <!-- ── VUE SUCCÈS ──────────────────────────────────────────────── -->
        <div v-else class="px-8 py-12 text-center space-y-4">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900">Demande envoyée !</h2>
          <p class="text-sm text-gray-500 leading-relaxed">
            Votre demande a été transmise à l'administrateur.<br>
            Vous recevrez un email avec vos identifiants une fois votre compte validé.
          </p>
          <button
            @click="resetRequest"
            class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft class="h-4 w-4" />
            Retour à la connexion
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
