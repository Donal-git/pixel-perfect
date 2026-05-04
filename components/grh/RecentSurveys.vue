<script setup lang="ts">
import { CheckCircle2, Clock, Archive, Pencil, Send, Plus } from 'lucide-vue-next'

interface SurveyQuestion {
  id: string
  question_text: string
  question_type: string
  options: string[]
  is_required: boolean
}

interface Survey {
  id: string
  title: string
  description: string
  status: 'active' | 'draft' | 'closed'
  questions: SurveyQuestion[]
  sent_to: string[]
  created_at: string
}

defineProps<{
  surveys: Survey[]
}>()

const statusConfig = {
  active:  { label: 'Actif',      class: 'bg-green-100 text-green-700 border-green-200' },
  draft:   { label: 'Brouillon',  class: 'bg-amber-50 text-amber-700 border-amber-200'  },
  closed:  { label: 'Fermé',      class: 'bg-gray-100 text-gray-500 border-gray-200'    }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="rounded-xl border bg-white shadow-sm">

    <!-- Header -->
    <div class="flex items-center justify-between border-b px-5 py-4">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Sondages récents</h2>
        <p class="mt-0.5 text-xs text-gray-400">Les 5 derniers sondages créés</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/grh/surveys"
          class="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          Voir tous →
        </NuxtLink>
      </div>
    </div>

    <!-- État vide -->
    <div
      v-if="surveys.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <CheckCircle2 class="h-7 w-7 text-gray-300" />
      </div>
      <p class="mt-4 text-sm font-medium text-gray-500">Aucun sondage créé</p>
      <p class="mt-1 text-xs text-gray-400">Commencez par créer votre premier sondage</p>
      <NuxtLink
        to="/grh/surveys/create"
        class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        <Plus class="h-3.5 w-3.5" />
        Créer un sondage
      </NuxtLink>
    </div>

    <!-- Liste -->
    <div v-else class="divide-y">
      <div
        v-for="survey in surveys"
        :key="survey.id"
        class="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-gray-50"
      >
        <!-- Icône statut -->
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          :class="{
            'bg-green-100': survey.status === 'active',
            'bg-amber-50':  survey.status === 'draft',
            'bg-gray-100':  survey.status === 'closed'
          }"
        >
          <CheckCircle2 v-if="survey.status === 'active'" class="h-4 w-4 text-green-600" />
          <Clock        v-else-if="survey.status === 'draft'" class="h-4 w-4 text-amber-600" />
          <Archive      v-else class="h-4 w-4 text-gray-500" />
        </div>

        <!-- Infos -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-900">{{ survey.title }}</p>
          <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span>{{ formatDate(survey.created_at) }}</span>
            <span>·</span>
            <span>{{ survey.questions.length }} question{{ survey.questions.length > 1 ? 's' : '' }}</span>
            <template v-if="survey.sent_to.length > 0">
              <span>·</span>
              <span class="max-w-[160px] truncate text-blue-500">
                {{ survey.sent_to.join(', ') }}
              </span>
            </template>
          </div>
        </div>

        <!-- Badge statut -->
        <span
          class="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="statusConfig[survey.status]?.class"
        >
          {{ statusConfig[survey.status]?.label }}
        </span>

        <!-- Actions -->
        <div class="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <NuxtLink
            :to="`/grh/surveys/${survey.id}/edit`"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            title="Modifier"
          >
            <Pencil class="h-3.5 w-3.5" />
          </NuxtLink>
          <NuxtLink
            to="/grh/surveys"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-green-200 hover:bg-green-50 hover:text-green-600"
            title="Envoyer"
          >
            <Send class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="surveys.length > 0" class="border-t px-5 py-3">
      <NuxtLink
        to="/grh/surveys/create"
        class="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <Plus class="h-4 w-4" />
        Créer un nouveau sondage
      </NuxtLink>
    </div>

  </div>
</template>
