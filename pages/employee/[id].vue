<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Save, Upload, Download, Trash2, FileText,
  User, Mail, Phone, Building2, Briefcase, Loader2
} from 'lucide-vue-next'
import { useApi } from '~/composables/useApi'
import { useDocumentStore, type Document } from '~/stores/document'
import { useToast } from '~/composables/useToast'

const route  = useRoute()
const api    = useApi()
const docStore = useDocumentStore()
const toast  = useToast()

const userId = (route.params.id || route.params.userId) as string

// ── État ────────────────────────────────────────────────────────────────────
const loading       = ref(true)
const saving        = ref(false)
const deletingId    = ref<string | null>(null)
const downloadingId = ref<string | null>(null)
const profile       = ref<any>(null)
const uploadType    = ref<Document['type']>('contrat')
const fileInputRef  = ref<HTMLInputElement | null>(null)

const form = ref({
  full_name:  '',
  email:      '',
  phone:      '',
  department: '',
  position:   ''
})

// ── Types de documents (correspond au contrat API) ──────────────────────────
const DOC_TYPES: { value: Document['type']; label: string }[] = [
  { value: 'contrat',          label: 'Contrat' },
  { value: 'diplome',          label: 'Diplôme' },
  { value: 'attestation',      label: 'Attestation' },
  { value: 'bulletin_salaire', label: 'Bulletin de salaire' },
  { value: 'piece_identite',   label: "Pièce d'identité" },
  { value: 'autre',            label: 'Autre' },
]

const typeLabel = (type: string) =>
  DOC_TYPES.find(t => t.value === type)?.label ?? type

const typeColor = (type: string) => {
  const map: Record<string, string> = {
    contrat:          'bg-teal-50 text-teal-700',
    diplome:          'bg-purple-100 text-purple-700',
    attestation:      'bg-green-100 text-green-700',
    bulletin_salaire: 'bg-amber-100 text-amber-700',
    piece_identite:   'bg-rose-100 text-rose-700',
    autre:            'bg-gray-100 text-gray-600',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

// ── Chargement ──────────────────────────────────────────────────────────────
const loadData = async () => {
  loading.value = true
  try {
    const user: any = await api.get(`/users/${userId}`)
    const profileData = {
      user_id:    user.id,
      full_name:  user.name,
      email:      user.email,
      phone:      user.phone || '',
      department: user.department,
      position:   user.position
    }
    profile.value = profileData
    form.value = { ...profileData }
    await docStore.fetchDocuments(userId)
  } catch (e) {
    console.error(e)
    toast.error('Erreur', 'Impossible de charger le profil')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// ── Sauvegarde du profil ────────────────────────────────────────────────────
const handleSave = async () => {
  saving.value = true
  try {
    await api.put(`/users/${userId}`, {
      name:       form.value.full_name,
      email:      form.value.email,
      phone:      form.value.phone,
      department: form.value.department,
      position:   form.value.position
    })
    profile.value = { ...profile.value, ...form.value }
    toast.success('Profil mis à jour', 'Les informations ont été enregistrées.')
  } catch (e: any) {
    toast.error('Erreur', e?.data?.message || 'Impossible de mettre à jour le profil')
  } finally {
    saving.value = false
  }
}

// ── Upload ──────────────────────────────────────────────────────────────────
const handleUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await docStore.uploadDocument(file, userId, uploadType.value)
    toast.success('Document ajouté', `"${file.name}" a été uploadé.`)
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (e: any) {
    toast.error('Erreur upload', e?.data?.message || 'Impossible d\'uploader le fichier')
  }
}

// ── Téléchargement ──────────────────────────────────────────────────────────
const handleDownload = async (doc: Document) => {
  downloadingId.value = doc.id
  try {
    await docStore.downloadDocument(doc.id, doc.name)
  } catch {
    toast.error('Erreur', 'Impossible de télécharger le fichier')
  } finally {
    downloadingId.value = null
  }
}

// ── Suppression ─────────────────────────────────────────────────────────────
const handleDelete = async (doc: Document) => {
  deletingId.value = doc.id
  try {
    await docStore.deleteDocument(doc.id)
    toast.success('Document supprimé', `"${doc.name}" a été retiré.`)
  } catch {
    toast.error('Erreur', 'Impossible de supprimer le document')
  } finally {
    deletingId.value = null
  }
}

// ── Formatage ───────────────────────────────────────────────────────────────
const formatSize = (bytes: number) => {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>

    <div v-else-if="!profile" class="flex flex-col items-center justify-center py-20 text-center">
      <User class="h-12 w-12 text-gray-200" />
      <p class="mt-4 text-sm text-gray-500">Employé introuvable</p>
    </div>

    <template v-else>

      <!-- HEADER ─────────────────────────────────────────────────────────── -->
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-xl font-bold text-teal-600">
          {{ profile.full_name?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ profile.full_name }}</h1>
          <p class="text-sm text-gray-500">{{ profile.position }} · {{ profile.department }}</p>
        </div>
      </div>

      <!-- PROFIL ─────────────────────────────────────────────────────────── -->
      <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
        <h2 class="text-base font-semibold text-gray-800">Informations personnelles</h2>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <User class="h-3.5 w-3.5 text-gray-400" /> Nom complet
            </label>
            <input
              v-model="form.full_name"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Mail class="h-3.5 w-3.5 text-gray-400" /> Email
            </label>
            <input
              v-model="form.email"
              type="email"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Phone class="h-3.5 w-3.5 text-gray-400" /> Téléphone
            </label>
            <input
              v-model="form.phone"
              type="tel"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Building2 class="h-3.5 w-3.5 text-gray-400" /> Département
            </label>
            <input
              v-model="form.department"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Briefcase class="h-3.5 w-3.5 text-gray-400" /> Poste
            </label>
            <input
              v-model="form.position"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        <div class="flex justify-end">
          <button
            @click="handleSave"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </div>

      <!-- DOCUMENTS ──────────────────────────────────────────────────────── -->
      <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-800">Documents</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ docStore.documents.length }} document(s)</p>
          </div>
        </div>

        <!-- Upload zone -->
        <div class="flex flex-col gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center">
          <select
            v-model="uploadType"
            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option v-for="t in DOC_TYPES" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>

          <label class="relative flex-1">
            <input
              type="file"
              ref="fileInputRef"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              class="absolute inset-0 cursor-pointer opacity-0"
              @change="handleUpload"
              :disabled="docStore.uploading"
            />
            <span
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              :class="docStore.uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
            >
              <Loader2 v-if="docStore.uploading" class="h-4 w-4 animate-spin text-teal-600" />
              <Upload v-else class="h-4 w-4 text-gray-400" />
              {{ docStore.uploading ? 'Upload en cours…' : 'Choisir un fichier' }}
            </span>
          </label>
          <p class="text-xs text-gray-400 whitespace-nowrap">PDF, JPG, PNG, DOC — max 10 Mo</p>
        </div>

        <!-- Chargement documents -->
        <div v-if="docStore.loading" class="flex items-center justify-center py-8">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>

        <!-- Aucun document -->
        <div v-else-if="docStore.documents.length === 0" class="flex flex-col items-center justify-center rounded-lg bg-gray-50 py-10 text-center">
          <FileText class="h-10 w-10 text-gray-200" />
          <p class="mt-3 text-sm font-medium text-gray-900">Aucun document</p>
          <p class="mt-1 text-xs text-gray-500">Uploadez le premier document via le formulaire ci-dessus.</p>
        </div>

        <!-- Liste -->
        <div v-else class="divide-y rounded-lg border">
          <div
            v-for="doc in docStore.documents"
            :key="doc.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
          >
            <!-- Icône fichier -->
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <FileText class="h-4 w-4 text-gray-500" />
            </div>

            <!-- Infos -->
            <div class="flex-1 min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">{{ doc.name }}</p>
              <div class="mt-0.5 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="typeColor(doc.type)"
                >{{ typeLabel(doc.type) }}</span>
                <span class="text-xs text-gray-400">{{ formatSize(doc.size) }}</span>
                <span class="text-xs text-gray-400">{{ formatDate(doc.createdAt) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="handleDownload(doc)"
                :disabled="downloadingId === doc.id"
                title="Télécharger"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-teal-50 hover:text-teal-600 disabled:opacity-40"
              >
                <Loader2 v-if="downloadingId === doc.id" class="h-4 w-4 animate-spin" />
                <Download v-else class="h-4 w-4" />
              </button>
              <button
                @click="handleDelete(doc)"
                :disabled="deletingId === doc.id"
                title="Supprimer"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                <Loader2 v-if="deletingId === doc.id" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </template>
  </div>
</template>
