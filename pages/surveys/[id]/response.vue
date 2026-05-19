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
const questions = ref<any[]>([])
const answers = ref<Record<string, string | string[]>>({})
const loading = ref(true)
const submitting = ref(false)
const isResponseSubmitted = ref(false)
const isResponseDraft = ref(false)

// 🔄 Load survey data
onMounted(async () => {
  loading.value = true
  try {
    // Load survey store
    await surveyStore.loadFromStorage()
    await surveyStore.loadResponsesFromStorage()

    // Get survey by ID
    const foundSurvey = surveyStore.getSurveyById(surveyId)
    if (foundSurvey) {
      survey.value = foundSurvey
      questions.value = foundSurvey.questions || []

      // Initialize answers with existing response if any
      if (currentUser.value?.id) {
        const existingResponse = surveyStore.getResponseByEmployeeAndSurvey(
          surveyId,
          currentUser.value.id
        )
        if (existingResponse) {
          answers.value = existingResponse.answers
          isResponseSubmitted.value = existingResponse.status === 'submitted'
          isResponseDraft.value = existingResponse.status === 'draft'
        }
      }
    }
  } catch (error) {
    console.error('Error loading survey:', error)
  } finally {
    loading.value = false
  }
})

// 📝 Validate answers
const validateAnswers = () => {
  const errors: string[] = []

  questions.value.forEach((q: any, index: number) => {
    if (q.is_required) {
      const answer = answers.value[q.id]
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        errors.push(`Question ${index + 1}: ${q.question_text} est obligatoire`)
      }
    }
  })

  return errors
}

// ✅ Submit responses
const handleSubmit = async () => {
  const errors = validateAnswers()

  if (errors.length > 0) {
    alert('Veuillez remplir toutes les questions obligatoires:\n\n' + errors.join('\n'))
    return
  }

  if (!currentUser.value?.id) {
    alert('Erreur: Utilisateur non identifié')
    return
  }

  submitting.value = true

  try {
    await surveyStore.submitResponse(surveyId, currentUser.value.id, answers.value)
    alert('✓ Vos réponses ont été envoyées avec succès')
    await router.push('/employee')
  } catch (error) {
    console.error('Error submitting response:', error)
    alert('✗ Erreur lors de l\'envoi des réponses')
  } finally {
    submitting.value = false
  }
}

// 💾 Save as draft
const handleSaveDraft = async () => {
  if (!currentUser.value?.id) {
    alert('Erreur: Utilisateur non identifié')
    return
  }

  try {
    await surveyStore.saveResponseDraft(surveyId, currentUser.value.id, answers.value)
    alert('✓ Brouillon enregistré')
  } catch (error) {
    console.error('Error saving draft:', error)
    alert('✗ Erreur lors de l\'enregistrement du brouillon')
  }
}

// Submit draft to GRH
const submitDraftToGRH = async () => {
  const errors = validateAnswers()

  if (errors.length > 0) {
    alert('Veuillez remplir toutes les questions obligatoires:\n\n' + errors.join('\n'))
    return
  }

  if (!currentUser.value?.id) {
    alert('Erreur: Utilisateur non identifié')
    return
  }

  submitting.value = true

  try {
    await surveyStore.submitResponse(surveyId, currentUser.value.id, answers.value)
    isResponseSubmitted.value = true
    isResponseDraft.value = false
    alert('✓ Vos réponses ont été envoyées au GRH avec succès')
  } catch (error) {
    console.error('Error submitting response:', error)
    alert('✗ Erreur lors de l\'envoi des réponses')
  } finally {
    submitting.value = false
  }
}

// �🔙 Go back
const goBack = () => {
  router.push('/employee')
}

// 📋 Get options safe
const getOptions = (options: any) => {
  return Array.isArray(options) ? options : []
}

// 🎨 Get question style
const getQuestionStyle = (questionType: string) => {
  const baseClass = 'p-4 rounded-lg border transition'
  const hoverClass = 'hover:shadow-md'
  return `${baseClass} ${hoverClass}`
}

// Update checkbox answer
const updateCheckboxAnswer = (questionId: string, option: string, checked: boolean) => {
  const current = (answers.value[questionId] as string[]) || []
  if (checked) {
    answers.value[questionId] = [...current, option]
  } else {
    answers.value[questionId] = current.filter(o => o !== option)
  }
}

// Check if checkbox is checked
const isCheckboxChecked = (questionId: string, option: string) => {
  const answer = answers.value[questionId]
  if (Array.isArray(answer)) {
    return answer.includes(option)
  }
  return false
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6 animate-fade-in">
    <!-- LOADING -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-muted-foreground">Chargement du sondage...</p>
    </div>

    <!-- NOT FOUND -->
    <div v-else-if="!survey" class="text-center py-12">
      <p class="text-muted-foreground mb-4">Sondage introuvable</p>
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
          ← Retour
        </button>
        <h1 class="text-3xl font-bold text-foreground">{{ survey.title }}</h1>
        <p v-if="survey.description" class="text-muted-foreground mt-2">
          {{ survey.description }}
        </p>
        <div class="flex items-center gap-4 mt-4">
          <span
            :class="{
              'px-3 py-1 rounded-full text-xs font-medium': true,
              'bg-green-100 text-green-800': survey.status === 'active',
              'bg-yellow-100 text-yellow-800': survey.status === 'draft',
              'bg-gray-100 text-gray-800': survey.status === 'closed'
            }"
          >
            {{ survey.status === 'active' ? '🟢 Actif' : survey.status === 'draft' ? '📋 Brouillon' : '🔴 Fermé' }}
          </span>
          <span v-if="survey.isAnonymous" class="text-xs text-muted-foreground">
            👤 Anonyme
          </span>
        </div>
      </div>

      <!-- INFO BAR -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p>
          <strong>{{ questions.length }}</strong> question{{ questions.length > 1 ? 's' : '' }} à répondre
          <span v-if="questions.some(q => q.is_required)" class="block mt-1">
            Les champs marqués avec <span class="text-red-600">*</span> sont obligatoires
          </span>
        </p>
      </div>

      <!-- SUBMITTED WARNING -->
      <div v-if="isResponseSubmitted" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl">✓</span>
          <div>
            <p class="font-semibold text-green-900">Réponses Déjà Soumises</p>
            <p class="text-sm text-green-800 mt-1">
              Vous avez déjà soumis vos réponses à ce sondage. Vous ne pouvez pas les modifier.
            </p>
            <p class="text-sm text-green-800 mt-2">
              Pour consulter vos réponses, allez dans <strong>"Mes Sondages"</strong>.
            </p>
          </div>
        </div>
      </div>

      <!-- DRAFT INFO -->
      <div v-else-if="isResponseDraft" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <span class="text-2xl">📝</span>
          <div>
            <p class="font-semibold text-yellow-900">Brouillon en Cours</p>
            <p class="text-sm text-yellow-800 mt-1">
              Vous pouvez continuer à modifier votre brouillon. N'oubliez pas de soumettre avant de partir.
            </p>
          </div>
        </div>
      </div>

      <!-- FORM -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- QUESTIONS -->
        <div
          v-for="(q, index) in questions"
          :key="q.id"
          :class="getQuestionStyle(q.question_type)"
        >
          <div class="mb-4">
            <p class="font-semibold text-foreground">
              {{ index + 1 }}. {{ q.question_text }}
              <span v-if="q.is_required" class="text-red-600">*</span>
            </p>
          </div>

          <!-- TEXT INPUT -->
          <textarea
            v-if="q.question_type === 'open_text'"
            v-model="answers[q.id]"
            :disabled="isResponseSubmitted"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows="4"
            placeholder="Tapez votre réponse ici..."
          />

          <!-- MULTIPLE CHOICE (RADIO) -->
          <div v-if="q.question_type === 'multiple_choice'" class="space-y-2">
            <label
              v-for="(opt, j) in getOptions(q.options)"
              :key="j"
              :class="{
                'flex items-center gap-3 p-2 rounded transition cursor-pointer': true,
                'hover:bg-accent': !isResponseSubmitted,
                'opacity-50 cursor-not-allowed': isResponseSubmitted
              }"
            >
              <input
                type="radio"
                :name="q.id"
                :value="opt"
                v-model="answers[q.id]"
                :disabled="isResponseSubmitted"
                class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
              />
              <span>{{ opt }}</span>
            </label>
          </div>

          <!-- CHECKBOX (MULTIPLE) -->
          <div v-if="q.question_type === 'checkbox'" class="space-y-2">
            <label
              v-for="(opt, j) in getOptions(q.options)"
              :key="j"
              :class="{
                'flex items-center gap-3 p-2 rounded transition cursor-pointer': true,
                'hover:bg-accent': !isResponseSubmitted,
                'opacity-50 cursor-not-allowed': isResponseSubmitted
              }"
            >
              <input
                type="checkbox"
                :checked="isCheckboxChecked(q.id, opt)"
                @change="(e: any) => !isResponseSubmitted && updateCheckboxAnswer(q.id, opt, e.target.checked)"
                :disabled="isResponseSubmitted"
                class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
              />
              <span>{{ opt }}</span>
            </label>
          </div>

          <!-- LIKERT SCALE (1-5) -->
          <div v-if="q.question_type === 'likert'" class="flex gap-4 justify-between">
            <label
              v-for="n in 5"
              :key="n"
              :class="{
                'flex flex-col items-center gap-2 cursor-pointer': true,
                'opacity-50': isResponseSubmitted
              }"
            >
              <input
                type="radio"
                :value="String(n)"
                v-model="answers[q.id]"
                :disabled="isResponseSubmitted"
                class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
              />
              <span class="text-sm text-muted-foreground">{{ n }}</span>
            </label>
          </div>

          <!-- RATING (STARS) -->
          <div v-if="q.question_type === 'rating'" class="flex gap-2">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              @click="!isResponseSubmitted && (answers[q.id] = String(n))"
              :disabled="isResponseSubmitted"
              class="text-3xl transition hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span :class="Number(answers[q.id]) >= n ? 'text-yellow-500' : 'text-gray-300'">
                ★
              </span>
            </button>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div v-if="!isResponseSubmitted" class="flex gap-3 pt-6 border-t">
          <button
            type="submit"
            :disabled="submitting"
            class="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 font-semibold"
          >
            {{ submitting ? '⏳ Envoi en cours...' : '✓ Soumettre les réponses' }}
          </button>
          <button
            type="button"
            @click="handleSaveDraft"
            class="px-4 py-3 border rounded-lg hover:bg-accent transition font-semibold"
          >
            💾 Brouillon
          </button>
          <button
            type="button"
            @click="goBack"
            class="px-4 py-3 border rounded-lg hover:bg-accent transition font-semibold"
          >
            Annuler
          </button>
        </div>

        <!-- ACTION BUTTONS FOR SUBMITTED -->
        <div v-else class="flex gap-3 pt-6 border-t">
          <button
            type="button"
            @click="router.push('/employee/surveys')"
            class="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold"
          >
            Voir mes sondages
          </button>
          <button
            type="button"
            @click="goBack"
            class="px-4 py-3 border rounded-lg hover:bg-accent transition font-semibold"
          >
            Retour
          </button>
        </div>
      </form>
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