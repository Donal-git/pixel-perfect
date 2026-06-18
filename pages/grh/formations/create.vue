<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ChevronLeft, Save, Send, Clock, Users, Calendar, CheckSquare
} from 'lucide-vue-next'
import { useFormationStore, type Formation } from '~/stores/formation'
import { useToast } from '~/composables/useToast'

const formationStore = useFormationStore()
const toast          = useToast()
const loading        = ref(false)

// ── Étape 1 — Informations générales ─────────────────────────────────────────
const title       = ref('')
const description = ref('')
const category    = ref('Informatique')
const level       = ref<Formation['level']>('débutant')

const CATEGORIES = ['Informatique', 'Management', 'Soft Skills', 'Technique', 'Sécurité', 'Juridique', 'Finance', 'Autre']

// ── Étape 2 — Départements destinataires ──────────────────────────────────────
const DEPARTMENTS = [
  'RH', 'Finance', 'IT', 'Commercial',
  'Production', 'Marketing', 'Direction', 'Logistique'
]
const selectedDepartments = ref<string[]>([])

const allSelected = computed(() => selectedDepartments.value.length === DEPARTMENTS.length)

const toggleDepartment = (dept: string) => {
  const idx = selectedDepartments.value.indexOf(dept)
  if (idx === -1) selectedDepartments.value.push(dept)
  else            selectedDepartments.value.splice(idx, 1)
}

const toggleAll = () => {
  selectedDepartments.value = allSelected.value ? [] : [...DEPARTMENTS]
}

// ── Étape 3 — Planning ────────────────────────────────────────────────────────
const duration     = ref('')
const participants = ref(0)
const startDate    = ref('')
const endDate      = ref('')

// ── Validation ───────────────────────────────────────────────────────────────
const validate = (status: 'brouillon' | 'disponible') => {
  if (!title.value.trim()) {
    toast.error('Le titre de la formation est obligatoire')
    return false
  }
  if (status === 'disponible') {
    if (!duration.value.trim()) {
      toast.error('La durée est obligatoire pour publier la formation')
      return false
    }
    if (selectedDepartments.value.length === 0) {
      toast.error('Sélectionnez au moins un département destinataire avant de publier')
      return false
    }
    if (startDate.value && endDate.value && endDate.value < startDate.value) {
      toast.error('La date de fin doit être postérieure à la date de début')
      return false
    }
  }
  return true
}

// ── Sauvegarde ───────────────────────────────────────────────────────────────
const handleSave = async (status: 'brouillon' | 'disponible') => {
  if (!validate(status)) return

  loading.value = true
  try {
    await formationStore.createFormation({
      title:        title.value.trim(),
      description:  description.value.trim(),
      category:     category.value,
      level:        level.value,
      duration:     duration.value.trim(),
      participants: participants.value,
      start_date:   startDate.value || undefined,
      end_date:     endDate.value   || undefined,
      departments:  status === 'disponible' ? [...selectedDepartments.value] : [],
      status
    })

    if (status === 'disponible') {
      toast.success(
        'Formation publiée et envoyée',
        `Département(s) notifié(s) : ${selectedDepartments.value.join(', ')}`
      )
    } else {
      toast.success('Brouillon enregistré', 'Vous pouvez le compléter et le publier plus tard')
    }

    await navigateTo('/grh/formations')
  } catch (err: any) {
    toast.error(err?.data?.message || 'Impossible de sauvegarder la formation')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 pb-10">

    <!-- ─── HEADER ──────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/grh/formations"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
      >
        <ChevronLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Créer une formation</h1>
        <p class="text-sm text-gray-500">Renseignez les informations, choisissez les destinataires puis planifiez les dates</p>
      </div>
    </div>

    <!-- ─── ÉTAPE 1 — INFORMATIONS GÉNÉRALES ────────────────────────────── -->
    <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
      <div class="flex items-center gap-2 border-b pb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">1</span>
        <h2 class="text-base font-semibold text-gray-800">Informations générales</h2>
      </div>

      <!-- Titre -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-gray-700">
          Titre de la formation <span class="text-red-500">*</span>
        </label>
        <input
          v-model="title"
          type="text"
          placeholder="Ex : Formation Excel avancé — T3 2025"
          class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-gray-700">
          Description
          <span class="ml-1 font-normal text-gray-400">(optionnel)</span>
        </label>
        <textarea
          v-model="description"
          placeholder="Décrivez les objectifs et le contenu de la formation..."
          rows="3"
          class="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <!-- Catégorie + Niveau -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Catégorie</label>
          <select
            v-model="category"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Niveau</label>
          <select
            v-model="level"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="débutant">Débutant</option>
            <option value="intermédiaire">Intermédiaire</option>
            <option value="avancé">Avancé</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ─── ÉTAPE 2 — DÉPARTEMENTS DESTINATAIRES ────────────────────────── -->
    <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
      <div class="flex items-center gap-2 border-b pb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">2</span>
        <h2 class="text-base font-semibold text-gray-800">Départements destinataires</h2>
        <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
          Requis pour publier
        </span>
      </div>

      <p class="text-sm text-gray-500">
        Sélectionnez les départements qui auront accès à cette formation. Seuls les employés de ces départements pourront s'inscrire.
      </p>

      <!-- Sélectionner tous -->
      <button
        type="button"
        @click="toggleAll"
        class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition"
        :class="allSelected
          ? 'border-teal-400 bg-teal-50'
          : 'border-dashed border-gray-300 hover:border-teal-300 hover:bg-gray-50'"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
          :class="allSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400'"
        >
          <CheckSquare class="h-4 w-4" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold" :class="allSelected ? 'text-teal-700' : 'text-gray-700'">
            Tous les départements
          </p>
          <p class="text-xs" :class="allSelected ? 'text-teal-500' : 'text-slate-400'">
            Envoyer à l'ensemble des {{ DEPARTMENTS.length }} départements
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
          :class="allSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'"
        >
          {{ DEPARTMENTS.length }}
        </span>
      </button>

      <!-- Grille des départements -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          v-for="dept in DEPARTMENTS"
          :key="dept"
          type="button"
          @click="toggleDepartment(dept)"
          class="group relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all"
          :class="selectedDepartments.includes(dept)
            ? 'border-teal-400 bg-teal-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-teal-50/30'"
        >
          <!-- Indicateur de sélection -->
          <span
            class="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold transition"
            :class="selectedDepartments.includes(dept)
              ? 'bg-teal-500 text-white'
              : 'border border-gray-300 bg-white text-transparent'"
          >✓</span>

          <!-- Avatar département -->
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white transition"
            :class="selectedDepartments.includes(dept) ? 'bg-teal-500' : 'bg-gray-300'"
          >
            {{ dept[0] }}
          </div>

          <span
            class="text-xs font-medium leading-tight"
            :class="selectedDepartments.includes(dept) ? 'text-teal-700' : 'text-gray-600'"
          >
            {{ dept }}
          </span>
        </button>
      </div>

      <!-- Compteur / message d'état -->
      <div
        class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
        :class="selectedDepartments.length > 0
          ? 'bg-teal-50 text-teal-700'
          : 'bg-amber-50 text-amber-700'"
      >
        <Users class="h-4 w-4 shrink-0" />
        <span v-if="selectedDepartments.length > 0">
          <strong>{{ selectedDepartments.length }} département{{ selectedDepartments.length > 1 ? 's' : '' }}</strong>
          sélectionné{{ selectedDepartments.length > 1 ? 's' : '' }} :
          {{ selectedDepartments.join(', ') }}
        </span>
        <span v-else>
          Aucun département sélectionné — sélectionnez au moins un département pour pouvoir publier la formation.
        </span>
      </div>
    </div>

    <!-- ─── ÉTAPE 3 — PLANNING ───────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white p-6 shadow-sm space-y-5">
      <div class="flex items-center gap-2 border-b pb-3">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">3</span>
        <h2 class="text-base font-semibold text-gray-800">Planning & Logistique</h2>
      </div>

      <!-- Durée + Participants -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Clock class="h-3.5 w-3.5 text-gray-400" />
            Durée <span class="text-red-500">*</span>
          </label>
          <input
            v-model="duration"
            type="text"
            placeholder="Ex : 2 jours, 4 heures"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <p class="mt-1 text-xs text-gray-400">Obligatoire pour la publication.</p>
        </div>
        <div>
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Users class="h-3.5 w-3.5 text-gray-400" />
            Participants max
            <span class="ml-1 font-normal text-gray-400">(optionnel)</span>
          </label>
          <input
            v-model.number="participants"
            type="number"
            min="0"
            placeholder="0"
            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      <!-- Dates -->
      <div>
        <label class="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Calendar class="h-3.5 w-3.5 text-gray-400" />
          Dates de la formation
          <span class="ml-1 font-normal text-gray-400">(optionnel)</span>
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-gray-500">Date de début</label>
            <input
              v-model="startDate"
              type="date"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-gray-500">Date de fin</label>
            <input
              v-model="endDate"
              type="date"
              :min="startDate || undefined"
              class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── ACTIONS ───────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
      <NuxtLink
        to="/grh/formations"
        class="text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        ← Annuler
      </NuxtLink>

      <div class="flex gap-3">
        <!-- Brouillon -->
        <button
          @click="handleSave('brouillon')"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <Save class="h-4 w-4" />
          Enregistrer en brouillon
        </button>

        <!-- Publier -->
        <button
          @click="handleSave('disponible')"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
          :title="selectedDepartments.length === 0 ? 'Sélectionnez au moins un département' : ''"
        >
          <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <Send v-else class="h-4 w-4" />
          {{ loading ? 'Publication en cours...' : 'Envoyer aux départements' }}
        </button>
      </div>
    </div>

  </div>
</template>
