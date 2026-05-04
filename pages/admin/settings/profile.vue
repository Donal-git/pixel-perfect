<template>
  <div class="space-y-8">
    <!-- Header Section -->
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-gray-900">
        Paramètres du profil Admin
      </h2>
      <p class="mt-2 text-lg text-gray-600">
        Gérez votre compte administrateur
      </p>
    </div>

    <!-- Profil Card -->
    <UCard class="shadow-lg hover:shadow-xl transition-all duration-300 border-0">
      <div class="p-8">
        <div class="text-center mb-8">
          <div class="mx-auto w-28 h-28 mb-6 relative">
            <UIAvatar class="w-28 h-28 text-xl border-4 border-white shadow-lg mx-auto">
              {{ profileForm.fullName[0]?.toUpperCase() || 'A' }}
            </UIAvatar>
            <label class="absolute bottom-0 right-0 bg-primary text-white p-3 rounded-full border-4 border-white shadow-lg cursor-pointer hover:bg-blue-600 transition-all block">
              <Upload class="w-5 h-5" />
              <input type="file" class="hidden" @change="handleAvatarUpload" accept="image/*" />
            </label>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ profileForm.fullName }}</h3>
        </div>

        <form @submit.prevent="updateProfile" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">Nom complet</label>
            <UIInput v-model="profileForm.fullName" placeholder="Nom complet" required />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">Email</label>
            <UIInput v-model="profileForm.email" type="email" placeholder="admin@rh.com" required />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-3">Numéro de téléphone</label>
            <UIInput v-model="profileForm.phone" placeholder="+33 1 23 45 67 89" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">Nouveau mot de passe</label>
            <UIInput v-model="profileForm.newPassword" type="password" placeholder="••••••••" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">Confirmer mot de passe</label>
            <UIInput v-model="profileForm.confirmPassword" type="password" placeholder="••••••••" />
          </div>

          <button 
            type="submit" 
            :disabled="isUpdating"
            class="md:col-span-2 w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-3"
          >
            <Save v-if="!isUpdating" class="w-5 h-5" />
            <span v-else class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            {{ isUpdating ? 'Mise à jour...' : 'Mettre à jour le profil' }}
          </button>
        </form>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { Upload, Save } from 'lucide-vue-next'
import UCard from '~/components/ui/Card.vue'
import UIInput from '~/components/ui/Input.vue'
import UIAvatar from '~/components/ui/Avatar.vue'
// import type { User } from '~/types'

import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

interface ProfileForm {
  fullName: string
  email: string
  phone: string
  newPassword: string
  confirmPassword: string
}

const profileForm = reactive<ProfileForm>({
  fullName: authStore.user?.name || 'Admin Principal',
  email: authStore.user?.email || 'admin@test.com',
  phone: '+33 1 23 45 67 89',
  newPassword: '',
  confirmPassword: ''
})

const avatarPreview = ref<string | null>(null)
const isUpdating = ref(false)

const handleAvatarUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const updateProfile = async () => {
  if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
    alert('Les mots de passe ne correspondent pas')
    return
  }

  isUpdating.value = true
  
  try {
    // TODO: Appel API réel
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update store si nom/email changés
    if (authStore.user) {
      authStore.user.name = profileForm.fullName
      authStore.user.email = profileForm.email
    }
    
    console.log('Profil mis à jour:', profileForm)
    alert('✅ Profil mis à jour avec succès!')
    
    // Reset passwords
    profileForm.newPassword = ''
    profileForm.confirmPassword = ''
    
  } catch (error) {
    alert('❌ Erreur lors de la mise à jour')
  } finally {
    isUpdating.value = false
  }
}
</script>

