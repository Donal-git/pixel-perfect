<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'



// 📍 route param
const route = useRoute()
const api = useApi()
const userId = (route.params.id || route.params.userId) as string

// 📦 state
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)

const profile = ref<any>(null)
const documents = ref<any[]>([])

const uploadCategory = ref('general')
const fileInputRef = ref<HTMLInputElement | null>(null)

// 📝 form
const form = ref({
  full_name: '',
  email: '',
  phone: '',
  department: '',
  position: ''
})

// 📂 catégories
const DOC_CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "contrat", label: "Contrat" },
  { value: "formation", label: "Formation" },
  { value: "evaluation", label: "Évaluation" },
  { value: "medical", label: "Médical" },
  { value: "administratif", label: "Administratif" },
  { value: "autre", label: "Autre" },
]

// 🔄 LOAD DATA
const loadData = async () => {
  loading.value = true
  try {
    const user: any = await api.get(`/users/${userId}`)
    const profileData = {
      user_id: user.id,
      full_name: user.name,
      email: user.email,
      phone: user.phone || '',
      department: user.department,
      position: user.position
    }
    profile.value = profileData
    form.value = { ...profileData }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

onMounted(loadData)

// 💾 SAVE
const handleSave = async () => {
  saving.value = true
  try {
    await api.put(`/users/${userId}`, {
      name: form.value.full_name,
      email: form.value.email,
      phone: form.value.phone,
      department: form.value.department,
      position: form.value.position
    })
    profile.value = { ...profile.value, ...form.value }
    alert("Profil mis à jour")
  } catch (e: any) {
    alert(e?.data?.message || "Erreur lors de la mise à jour")
  }
  saving.value = false
}

// 📤 UPLOAD (mock)
const handleUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploading.value = true

  setTimeout(() => {
    documents.value.unshift({
      id: Date.now().toString(),
      file_name: file.name,
      category: uploadCategory.value,
      file_size: file.size,
      created_at: new Date().toISOString()
    })

    uploading.value = false
  }, 2000)
}

// 📥 DOWNLOAD (mock)
const handleDownload = (doc: any) => {
  alert(`Téléchargement: ${doc.file_name}`)
}

// 🗑 DELETE
const handleDelete = (doc: any) => {
  documents.value = documents.value.filter(d => d.id !== doc.id)
}

// 📏 format taille
const formatSize = (bytes: number) => {
  if (!bytes) return "—"
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}
</script>

<template>
  <div class="space-y-6">

    <!-- LOADING -->
    <div v-if="loading" class="text-center py-10">
      Chargement...
    </div>

    <div v-else-if="!profile" class="text-center py-10">
      Employé introuvable
    </div>

    <div v-else>

      <!-- HEADER -->
      <div>
        <h1 class="text-2xl font-bold">
          {{ profile.full_name }}
        </h1>
        <p class="text-sm text-gray-500">
          {{ profile.email }}
        </p>
      </div>

      <!-- PROFILE -->
      <div class="border p-4 rounded-lg space-y-4">

        <h2 class="font-semibold">Informations personnelles</h2>

        <div class="grid gap-4 sm:grid-cols-2">
          <input v-model="form.full_name" placeholder="Nom complet" class="border p-2" />
          <input v-model="form.email" type="email" placeholder="Email" class="border p-2" />
          <input v-model="form.phone" placeholder="Téléphone" class="border p-2" />
          <input v-model="form.department" placeholder="Département" class="border p-2" />
          <input v-model="form.position" placeholder="Poste" class="border p-2" />
        </div>

        <button @click="handleSave" class="bg-black text-white px-4 py-2 rounded">
          {{ saving ? "Enregistrement..." : "Enregistrer" }}
        </button>
      </div>

      <!-- DOCUMENTS -->
      <div class="border p-4 rounded-lg space-y-4">

        <h2 class="font-semibold">
          Documents ({{ documents.length }})
        </h2>

        <!-- UPLOAD -->
        <div class="flex gap-3 items-center">

          <select v-model="uploadCategory" class="border p-2">
            <option v-for="c in DOC_CATEGORIES" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>

          <input type="file" ref="fileInputRef" @change="handleUpload" />

        </div>

        <!-- LIST -->
        <div v-if="documents.length === 0" class="text-center text-sm text-gray-500">
          Aucun document
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="flex justify-between items-center border p-2 rounded"
          >
            <div>
              <p>{{ doc.file_name }}</p>
              <p class="text-xs text-gray-500">
                {{ formatSize(doc.file_size) }}
              </p>
            </div>

            <div class="flex gap-2">
              <button @click="handleDownload(doc)">⬇️</button>
              <button @click="handleDelete(doc)">🗑</button>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>