<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useSurveyStore } from '~/stores/survey'

// 🧭 Navigation
const route = useRoute()
const router = useRouter()

// 📦 Stores
const authStore = useAuthStore()
const surveyStore = useSurveyStore()

// 👤 Current user
const currentUser = computed(() => authStore.user)

// 📍 Route params
const surveyId = route.params.id as string

// 📊 State
const survey = ref<any>(null)
const response = ref<any>(null)
const loading = ref(true)

// 🔄 Load data
onMounted(async () => {
  loading.value = true
  try {
    // Load stores
    await surveyStore.loadFromStorage()
    await surveyStore.loadResponsesFromStorage()

    if (currentUser.value?.id) {
      // Get survey with response
      const data = surveyStore.getSurveyWithResponse(surveyId, currentUser.value.id)
      if (data) {
        survey.value = data.survey
        response.value = data.response
      }
    }
  } catch (error) {
    console.error('Error loading survey:', error)
  } finally {
    loading.value = false
  }
})

// 🔙 Go back
const goBack = () => {
  router.push('/employee/surveys')
}

// 📝 Get answer display value
const getAnswerDisplay = (question: any, answer: any) => {
  if (!answer) return '—'
  if (Array.isArray(answer)) {
    return answer.join(', ')
  }
  return answer
}

// 📅 Format date
const formatDate = computed(() => {
  if (!response.value?.submitted_at) return 'N/A'
  return new Date(response.value.submitted_at).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6 animate-fade-in">
    <!-- LOADING -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-muted-foreground">Chargement de vos réponses...</p>
    </div>

    <!-- NOT FOUND -->
    <div v-else-if="!survey || !response" class="text-center py-12">
      <p class="text-muted-foreground mb-4">Réponses introuvables</p>
      <button
        @click="goBack"
        class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
      >
        ← Retour
      </button>
    </div>

    <!-- CONTENT -->
    <div v-else class="space-y-6">
      <!-- HEADER -->
      <div>
        <button
          @click="goBack"
          class="text-primary hover:underline mb-4 flex items-center gap-2"
        >
          ← Retour à mes sondages
        </button>
        <h1 class="text-3xl font-bold text-foreground">{{ survey.title }}</h1>
        <p v-if="survey.description" class="text-muted-foreground mt-2">
          {{ survey.description }}
        </p>
      </div>

      <!-- SUBMISSION INFO -->
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl">✓</span>
          <div>
            <p class="font-semibold text-green-900">Réponses Soumises</p>
            <p class="text-sm text-green-800 mt-1">
              Vous avez soumis vos réponses le <strong>{{ formatDate }}</strong>
            </p>
            <p v-if="survey.isAnonymous" class="text-sm text-green-800 mt-2">
              📝 Ce sondage est anonyme - vos réponses ne peuvent pas être identifiées
            </p>
          </div>
        </div>
      </div>

      <!-- QUESTIONS & ANSWERS -->
      <div class="space-y-6">
        <h2 class="text-xl font-semibold">Vos Réponses</h2>

        <div
          v-for="(question, index) in survey.questions"
          :key="question.id"
          class="border rounded-lg p-4 bg-card"
        >
          <!-- QUESTION -->
          <div class="mb-4">
            <p class="font-semibold text-foreground">
              {{ index + 1 }}. {{ question.question_text }}
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              Type: <span class="font-medium">{{ question.question_type }}</span>
            </p>
          </div>

          <!-- ANSWER - READ ONLY -->
          <div class="bg-muted/50 rounded p-3">
            <!-- TEXT ANSWER -->
            <div v-if="question.question_type === 'open_text'" class="text-foreground whitespace-pre-wrap">
              {{ getAnswerDisplay(question, response.answers[question.id]) }}
            </div>

            <!-- MULTIPLE CHOICE / LIKERT / RATING -->
            <div
              v-else-if="['multiple_choice', 'likert', 'rating'].includes(question.question_type)"
              class="text-foreground font-medium"
            >
              {{ getAnswerDisplay(question, response.answers[question.id]) }}
            </div>

            <!-- CHECKBOX (MULTIPLE) -->
            <div v-else-if="question.question_type === 'checkbox'" class="space-y-2">
              <div
                v-for="item in getAnswerDisplay(question, response.answers[question.id]).split(', ')"
                :key="item"
                class="flex items-center gap-2"
              >
                <span class="text-primary">✓</span>
                <span class="text-foreground">{{ item }}</span>
              </div>
            </div>

            <!-- NO ANSWER -->
            <div v-else class="text-muted-foreground italic">
              {{ getAnswerDisplay(question, response.answers[question.id]) }}
            </div>
          </div>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="flex gap-3 pt-6 border-t">
        <button
          @click="goBack"
          class="flex-1 px-4 py-3 border rounded-lg hover:bg-accent transition font-medium"
        >
          ← Retour à mes sondages
        </button>
        <button
          @click="router.push('/employee')"
          class="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
        >
          Retour au dashboard
        </button>
      </div>

      <!-- INFO MESSAGE -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-blue-800">
          <strong>ℹ️ Information:</strong> Vous ne pouvez pas modifier vos réponses une fois soumises.
          Si vous souhaitez modifier votre réponse, veuillez contacter le GRH.
        </p>
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
