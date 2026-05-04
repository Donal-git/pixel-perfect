<script setup lang="ts">
import { ref } from 'vue'

// 📦 STATE
const loading = ref(false)

const title = ref('')
const description = ref('')
const isAnonymous = ref(false)

const questions = ref([
  {
    id: crypto.randomUUID(),
    question_text: '',
    question_type: 'multiple_choice',
    options: ['Option 1', 'Option 2'],
    is_required: true
  }
])

// 🏷 TYPES
const questionTypeLabels: Record<string, string> = {
  multiple_choice: "Choix multiples",
  open_text: "Texte libre",
  likert: "Échelle de Likert",
  checkbox: "Cases à cocher",
  rating: "Notation (1-5)"
}

// ➕ ADD QUESTION
const addQuestion = () => {
  questions.value.push({
    id: crypto.randomUUID(),
    question_text: '',
    question_type: 'multiple_choice',
    options: ['Option 1', 'Option 2'],
    is_required: true
  })
}

// ❌ REMOVE QUESTION
const removeQuestion = (id: string) => {
  if (questions.value.length > 1) {
    questions.value = questions.value.filter(q => q.id !== id)
  }
}

// 🔄 UPDATE QUESTION
const updateQuestion = (id: string, field: string, value: any) => {
  questions.value = questions.value.map(q =>
    q.id === id ? { ...q, [field]: value } : q
  )
}

// ➕ OPTION
const addOption = (questionId: string) => {
  questions.value = questions.value.map(q =>
    q.id === questionId
      ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
      : q
  )
}

// ✏️ UPDATE OPTION
const updateOption = (questionId: string, index: number, value: string) => {
  questions.value = questions.value.map(q =>
    q.id === questionId
      ? { ...q, options: q.options.map((o, i) => i === index ? value : o) }
      : q
  )
}

// ❌ REMOVE OPTION
const removeOption = (questionId: string, index: number) => {
  questions.value = questions.value.map(q =>
    q.id === questionId
      ? { ...q, options: q.options.filter((_, i) => i !== index) }
      : q
  )
}

// 🧠 TYPE CHECK
const needsOptions = (type: string) =>
  type === 'multiple_choice' || type === 'checkbox'

// 💾 SAVE (mock backend)
const handleSave = async (status: 'draft' | 'active') => {
  if (!title.value.trim()) {
    alert("Le titre est obligatoire")
    return
  }

  if (questions.value.some(q => !q.question_text.trim())) {
    alert("Toutes les questions doivent être remplies")
    return
  }

  loading.value = true

  try {
    // 👉 ICI TU METTRAS TON API
    // await $fetch('/api/surveys', { method: 'POST', body: {...} })

    console.log({
      title: title.value,
      description: description.value,
      isAnonymous: isAnonymous.value,
      questions: questions.value,
      status
    })

    alert(status === 'active' ? 'Sondage publié' : 'Brouillon enregistré')

    navigateTo('/surveys')
  } catch (e) {
    alert("Erreur")
  }

  loading.value = false
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">

    <!-- HEADER -->
    <div>
      <h1 class="text-2xl font-bold">Créer un sondage</h1>
      <p class="text-gray-500">Définissez les questions</p>
    </div>

    <!-- INFOS -->
    <div class="border p-4 rounded-lg space-y-4">
      <input v-model="title" placeholder="Titre" class="w-full border p-2" />
      <textarea v-model="description" placeholder="Description" class="w-full border p-2" />

      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="isAnonymous" />
        Réponses anonymes
      </label>
    </div>

    <!-- QUESTIONS -->
    <div class="space-y-4">
      <div v-for="(q, index) in questions" :key="q.id" class="border p-4 rounded">

        <div class="flex justify-between mb-3">
          <strong>Q{{ index + 1 }}</strong>
          <button @click="removeQuestion(q.id)">🗑</button>
        </div>

        <input
          v-model="q.question_text"
          placeholder="Question..."
          class="w-full border p-2 mb-2"
        />

        <select v-model="q.question_type" class="border p-2 w-full mb-2">
          <option v-for="(label, key) in questionTypeLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>

        <label>
          <input type="checkbox" v-model="q.is_required" />
          Obligatoire
        </label>

        <!-- OPTIONS -->
        <div v-if="needsOptions(q.question_type)" class="mt-3">
          <div v-for="(opt, i) in q.options" :key="i" class="flex gap-2 mb-2">
            <input v-model="q.options[i]" class="border p-1 w-full" />
            <button @click="removeOption(q.id, i)">❌</button>
          </div>

          <button @click="addOption(q.id)">➕ Ajouter option</button>
        </div>

      </div>

      <button @click="addQuestion" class="w-full border p-2">
        ➕ Ajouter une question
      </button>
    </div>

    <!-- ACTIONS -->
    <div class="flex justify-end gap-3">
      <button @click="handleSave('draft')" :disabled="loading">
        Enregistrer
      </button>

      <button @click="handleSave('active')" :disabled="loading">
        Publier
      </button>
    </div>

  </div>
</template>