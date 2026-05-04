<script setup lang="ts">
interface Props {
  userName?: string
  surveysPending?: number
  surveysCompleted?: number
  totalSurveys?: number
  formationsRegistered?: number
  formationsAvailable?: number
  role?: string
}

withDefaults(defineProps<Props>(), {
  userName: 'Employé',
  surveysPending: 0,
  surveysCompleted: 0,
  totalSurveys: 0,
  formationsRegistered: 0,
  formationsAvailable: 0,
  role: 'employee'
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <div class="border rounded-lg p-4 bg-card hover:shadow-md transition">
      <p class="text-sm text-muted-foreground font-medium">Sondages en attente</p>
      <p class="text-2xl font-bold mt-2">{{ surveysPending }}</p>
      <p class="text-xs text-muted-foreground mt-1">sur {{ totalSurveys }}</p>
    </div>

    <div class="border rounded-lg p-4 bg-card hover:shadow-md transition">
      <p class="text-sm text-muted-foreground font-medium">Sondages répondus</p>
      <p class="text-2xl font-bold mt-2">{{ surveysCompleted }}</p>
      <p class="text-xs text-muted-foreground mt-1">complétés</p>
    </div>

    <div class="border rounded-lg p-4 bg-card hover:shadow-md transition">
      <p class="text-sm text-muted-foreground font-medium">Mes formations</p>
      <p class="text-2xl font-bold mt-2">{{ formationsRegistered }}</p>
      <p class="text-xs text-muted-foreground mt-1">inscriptions</p>
    </div>

    <div class="border rounded-lg p-4 bg-card hover:shadow-md transition">
      <p class="text-sm text-muted-foreground font-medium">Formations disponibles</p>
      <p class="text-2xl font-bold mt-2">{{ formationsAvailable }}</p>
      <p class="text-xs text-muted-foreground mt-1">à explorer</p>
    </div>

    <div class="border rounded-lg p-4 bg-card hover:shadow-md transition">
      <p class="text-sm text-muted-foreground font-medium">Profil</p>
      <p class="text-2xl font-bold mt-2">{{ role }}</p>
      <p class="text-xs text-muted-foreground mt-1">rôle</p>
    </div>
  </div>
</template>
