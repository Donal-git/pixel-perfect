<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  UserPlus, CheckCircle2, XCircle, Clock, Users,
  Search, Loader2
} from 'lucide-vue-next'
import { useRegistrationRequestStore, type RegistrationRequest } from '~/stores/registrationRequest'
import { useToast } from '~/composables/useToast'

const store = useRegistrationRequestStore()
const toast = useToast()

// ── Filtre actif ─────────────────────────────────────────────────────────────
const activeFilter = ref<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
const search       = ref('')
const approvingId  = ref<string | null>(null)
const rejectingId  = ref<string | null>(null)

onMounted(() => store.fetchRequests())

// ── Données filtrées ─────────────────────────────────────────────────────────
const filtered = computed(() => {
  let list = store.requests
  if (activeFilter.value !== 'ALL') {
    list = list.filter(r => r.status === activeFilter.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(r =>
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.position.toLowerCase().includes(q)
    )
  }
  return list
})

const counts = computed(() => ({
  ALL:      store.requests.length,
  PENDING:  store.requests.filter(r => r.status === 'PENDING').length,
  APPROVED: store.requests.filter(r => r.status === 'APPROVED').length,
  REJECTED: store.requests.filter(r => r.status === 'REJECTED').length,
}))

// ── Actions ──────────────────────────────────────────────────────────────────
const handleApprove = async (req: RegistrationRequest) => {
  approvingId.value = req.id
  try {
    await store.approve(req.id)
    toast.success('Demande approuvée', `Le compte de ${req.fullName} a été créé. Un email lui a été envoyé.`)
  } catch (e: any) {
    toast.error('Erreur', e?.data?.message || 'Impossible d\'approuver cette demande')
  } finally {
    approvingId.value = null
  }
}

const handleReject = async (req: RegistrationRequest) => {
  rejectingId.value = req.id
  try {
    await store.reject(req.id)
    toast.success('Demande refusée', `La demande de ${req.fullName} a été rejetée.`)
  } catch (e: any) {
    toast.error('Erreur', e?.data?.message || 'Impossible de rejeter cette demande')
  } finally {
    rejectingId.value = null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const statusConfig = {
  PENDING:  { label: 'En attente', class: 'bg-amber-100 text-amber-700',  icon: Clock },
  APPROVED: { label: 'Approuvée',  class: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  REJECTED: { label: 'Refusée',    class: 'bg-red-100 text-red-600',      icon: XCircle },
}

const FILTERS: { key: typeof activeFilter.value; label: string }[] = [
  { key: 'ALL',      label: 'Toutes' },
  { key: 'PENDING',  label: 'En attente' },
  { key: 'APPROVED', label: 'Approuvées' },
  { key: 'REJECTED', label: 'Refusées' },
]
</script>

<template>
  <div class="space-y-6">

    <!-- HEADER ──────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Demandes d'inscription</h1>
        <p class="mt-1 text-sm text-gray-500">
          Validez ou refusez les demandes de création de compte employé
        </p>
      </div>
      <div
        v-if="counts.PENDING > 0"
        class="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700"
      >
        <Clock class="h-4 w-4" />
        {{ counts.PENDING }} demande(s) en attente
      </div>
    </div>

    <!-- CARTES RÉSUMÉ ───────────────────────────────────────────────────── -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ counts.ALL }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <Users class="h-5 w-5 text-gray-500" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">En attente</p>
            <p class="text-2xl font-bold text-amber-600 mt-1">{{ counts.PENDING }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <Clock class="h-5 w-5 text-amber-600" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Approuvées</p>
            <p class="text-2xl font-bold text-green-600 mt-1">{{ counts.APPROVED }}</p>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <CheckCircle2 class="h-5 w-5 text-green-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- FILTRES + RECHERCHE ─────────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex gap-1 rounded-lg border bg-white p-1 shadow-sm w-fit">
        <button
          v-for="f in FILTERS"
          :key="f.key"
          @click="activeFilter = f.key"
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition"
          :class="activeFilter === f.key
            ? 'bg-teal-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'"
        >
          {{ f.label }}
          <span
            class="rounded-full px-1.5 py-0.5 text-xs"
            :class="activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'"
          >{{ counts[f.key] }}</span>
        </button>
      </div>

      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher…"
          class="rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>
    </div>

    <!-- TABLEAU ─────────────────────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white shadow-sm overflow-hidden">

      <!-- Chargement -->
      <div v-if="store.loading" class="flex items-center justify-center py-16">
        <div class="h-7 w-7 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>

      <!-- Vide -->
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <UserPlus class="h-12 w-12 text-gray-200" />
        <p class="mt-4 text-sm font-medium text-gray-900">Aucune demande</p>
        <p class="mt-1 text-xs text-gray-500">
          {{ activeFilter === 'ALL' ? 'Les demandes soumises apparaîtront ici.' : 'Aucune demande avec ce statut.' }}
        </p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Candidat</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Département / Poste</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="req in filtered"
              :key="req.id"
              class="hover:bg-gray-50 transition"
            >
              <!-- Candidat -->
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-600">
                    {{ req.fullName?.[0]?.toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ req.fullName }}</p>
                    <p class="text-xs text-gray-500">{{ req.email }}</p>
                    <p v-if="req.phone" class="text-xs text-gray-400">{{ req.phone }}</p>
                  </div>
                </div>
              </td>

              <!-- Département / Poste -->
              <td class="px-4 py-4">
                <p class="font-medium text-gray-900">{{ req.department }}</p>
                <p class="text-xs text-gray-500">{{ req.position }}</p>
              </td>

              <!-- Date -->
              <td class="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                {{ formatDate(req.createdAt) }}
              </td>

              <!-- Statut -->
              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="statusConfig[req.status].class"
                >
                  <component :is="statusConfig[req.status].icon" class="h-3 w-3" />
                  {{ statusConfig[req.status].label }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-4 text-right">
                <div v-if="req.status === 'PENDING'" class="flex items-center justify-end gap-2">
                  <button
                    @click="handleApprove(req)"
                    :disabled="approvingId === req.id || rejectingId === req.id"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-40"
                  >
                    <Loader2 v-if="approvingId === req.id" class="h-3.5 w-3.5 animate-spin" />
                    <CheckCircle2 v-else class="h-3.5 w-3.5" />
                    Valider
                  </button>
                  <button
                    @click="handleReject(req)"
                    :disabled="approvingId === req.id || rejectingId === req.id"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-100 disabled:opacity-40"
                  >
                    <Loader2 v-if="rejectingId === req.id" class="h-3.5 w-3.5 animate-spin" />
                    <XCircle v-else class="h-3.5 w-3.5" />
                    Refuser
                  </button>
                </div>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
