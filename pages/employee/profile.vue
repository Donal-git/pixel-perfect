<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePersonnelStore } from '~/stores/personnel'
import { useRouter } from 'vue-router'

// 🧭 Navigation
const router = useRouter()

// 📦 Stores
const authStore = useAuthStore()
const personnelStore = usePersonnelStore()

// 👤 Current user
const currentUser = computed(() => authStore.user)

// 📊 State
const loading = ref(true)
const saving = ref(false)
const profileData = ref<any>(null)

// 📝 Form data
const form = ref({
  name: '',
  email: '',
  phone: '',
  department: '',
  position: ''
})

// 🔄 Load profile data
onMounted(async () => {
  loading.value = true
  try {
    // Load personnel store
    await personnelStore.loadFromStorage()

    // Get current user's profile
    if (currentUser.value?.id) {
      const profile = personnelStore.getPersonnelById(currentUser.value.id)
      if (profile) {
        profileData.value = profile
        form.value = {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          department: profile.department,
          position: profile.position
        }
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error)
  } finally {
    loading.value = false
  }
})

// 💾 Save profile
const handleSave = async () => {
  saving.value = true
  try {
    if (currentUser.value?.id && profileData.value) {
      await personnelStore.updateMember(currentUser.value.id, {
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone
      })

      if (authStore.user) {
        authStore.user.name = form.value.name
        authStore.user.email = form.value.email
        if (import.meta.client) {
          localStorage.setItem('auth_user', JSON.stringify(authStore.user))
        }
      }
    }
    alert('✓ Profil mis à jour avec succès')
  } catch (error: any) {
    console.error('Error saving profile:', error)
    alert('✗ ' + (error?.data?.message || 'Erreur lors de la mise à jour du profil'))
  } finally {
    saving.value = false
  }
}

// 🔙 Go back to dashboard
const goBack = () => {
  router.push('/employee')
}

// 📋 Get formatted registration date
const registrationDate = computed(() => {
  if (!profileData.value?.registeredAt) return 'N/A'
  return new Date(profileData.value.registeredAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// 🔐 Password change (optional feature)
const showPasswordForm = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handlePasswordChange = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Les mots de passe ne correspondent pas')
    return
  }

  alert('✓ Mot de passe modifié avec succès (simulation)')
  showPasswordForm.value = false
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
    <!-- HEADER -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-foreground">Mon Profil</h1>
        <p class="text-muted-foreground mt-1">Gérez vos informations personnelles</p>
      </div>
      <button
        @click="goBack"
        class="px-4 py-2 border rounded-lg hover:bg-accent transition"
      >
        Retour
      </button>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-muted-foreground">Chargement du profil...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- PERSONAL INFO SECTION -->
      <div class="border rounded-xl p-6 bg-card">
        <h2 class="text-xl font-semibold mb-6">👤 Informations Personnelles</h2>

        <!-- PROFILE HEADER -->
        <div class="pb-6 border-b mb-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {{ form.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Employé depuis</p>
              <p class="font-medium">{{ registrationDate }}</p>
            </div>
          </div>
        </div>

        <!-- FORM -->
        <form @submit.prevent="handleSave" class="space-y-4">
          <!-- Name -->
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-2">Nom Complet</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Votre nom complet"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium mb-2">Email</label>
              <input
                v-model="form.email"
                type="email"
                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="votre.email@entreprise.com"
              />
            </div>
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium mb-2">Téléphone</label>
            <input
              v-model="form.phone"
              type="tel"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+226 70 00 00 00"
            />
          </div>

          <!-- ADMIN ONLY INFO BOX -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div class="flex items-start gap-3">
              <div class="text-blue-600 text-xl flex-shrink-0">🔒</div>
              <div>
                <p class="font-semibold text-blue-900 text-sm">Champs gérés par l'administrateur</p>
                <p class="text-blue-700 text-xs mt-1">
                  Votre département et votre poste sont configurés par l'administrateur du système.
                  Pour toute modification, veuillez contacter votre responsable RH.
                </p>
              </div>
            </div>
          </div>

          <!-- Department & Position -->
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700">
                <span class="flex items-center gap-2">
                  Département
                  <!-- <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">Admin</span> -->
                </span>
              </label>
              <div class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed font-medium">
                {{ form.department || '—' }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700">
                <span class="flex items-center gap-2">
                  Poste
                  <!-- <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">Admin</span> -->
                </span>
              </label>
              <div class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed font-medium">
                {{ form.position || '—' }}
              </div>
            </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 font-medium"
            >
              {{ saving ? 'Enregistrement...' : '💾 Enregistrer les modifications' }}
            </button>
            <button
              type="button"
              @click="
                form = {
                  name: profileData.name,
                  email: profileData.email,
                  phone: profileData.phone,
                  department: profileData.department,
                  position: profileData.position
                }
              "
              class="px-4 py-2 border rounded-lg hover:bg-accent transition font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      <!-- SECURITY SECTION -->
      <div class="border rounded-xl p-6 bg-card">
        <h2 class="text-xl font-semibold mb-6">🔐 Sécurité</h2>

        <!-- SHOW/HIDE PASSWORD FORM -->
        <button
          @click="showPasswordForm = !showPasswordForm"
          class="px-4 py-2 border rounded-lg hover:bg-accent transition font-medium"
        >
          {{ showPasswordForm ? '✕ Fermer' : '🔑 Modifier le mot de passe' }}
        </button>

        <!-- PASSWORD FORM -->
        <form
          v-if="showPasswordForm"
          @submit.prevent="handlePasswordChange"
          class="space-y-4 mt-6 pt-6 border-t"
        >
          <div>
            <label class="block text-sm font-medium mb-2">Mot de passe actuel</label>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Entrez votre mot de passe actuel"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Nouveau mot de passe</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Entrez votre nouveau mot de passe"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Confirmez votre nouveau mot de passe"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
            >
              Mettre à jour le mot de passe
            </button>
            <button
              type="button"
              @click="showPasswordForm = false"
              class="px-4 py-2 border rounded-lg hover:bg-accent transition font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      <!-- PROFILE INFO CARDS -->
      <div class="grid gap-4 md:grid-cols-3">
        <div class="border rounded-lg p-4 bg-blue-50">
          <p class="text-sm text-blue-600 font-medium">Statut</p>
          <p class="text-lg font-semibold text-blue-900 mt-2">{{ profileData?.status === 'actif' ? '✓ Actif' : '✗ Inactif' }}</p>
        </div>

        <div class="border rounded-lg p-4 bg-green-50">
          <p class="text-sm text-green-600 font-medium">Rôle</p>
          <p class="text-lg font-semibold text-green-900 mt-2">{{ profileData?.role || 'Employé' }}</p>
        </div>

        <div class="border rounded-lg p-4 bg-purple-50">
          <p class="text-sm text-purple-600 font-medium">Compte</p>
          <p class="text-lg font-semibold text-purple-900 mt-2">{{ profileData?.accountType || 'Standard' }}</p>
        </div>
      </div>

      <!-- QUICK LINKS -->
      <div class="border rounded-xl p-6 bg-card">
        <h2 class="text-lg font-semibold mb-4">📚 Accès Rapide</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <router-link
            to="/employee"
            class="px-4 py-3 border rounded-lg hover:bg-accent transition flex items-center gap-2 font-medium"
          >
            📋 Retour au tableau de bord
          </router-link>
          <router-link
            to="/surveys"
            class="px-4 py-3 border rounded-lg hover:bg-accent transition flex items-center gap-2 font-medium"
          >
            📝 Sondages
          </router-link>
          <router-link
            to="/personnel"
            class="px-4 py-3 border rounded-lg hover:bg-accent transition flex items-center gap-2 font-medium"
          >
            👥 Annuaire du personnel
          </router-link>
          <button
            @click="authStore.logout()"
            class="px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition flex items-center gap-2 font-medium text-red-600"
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
