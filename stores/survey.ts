import { defineStore } from 'pinia'

export interface SurveyQuestion {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'open_text' | 'likert' | 'checkbox' | 'rating'
  options: string[]
  is_required: boolean
}

export interface Survey {
  id: string
  title: string
  description: string
  isAnonymous: boolean
  status: 'draft' | 'active' | 'closed'
  questions: SurveyQuestion[]
  created_at: string
  sent_to: string[]
}

export interface SurveyResponse {
  id: string
  survey_id: string
  employee_id: string
  answers: Record<string, any>
  submitted_at: string
  status: 'draft' | 'submitted'
}

const STORAGE_KEY = 'grh_surveys'
const RESPONSES_STORAGE_KEY = 'grh_survey_responses'

const initialData: Survey[] = [
  {
    id: 'demo-1',
    title: 'Satisfaction des employés Q1 2024',
    description: 'Évaluation trimestrielle de la satisfaction au travail',
    isAnonymous: true,
    status: 'active',
    questions: [
      {
        id: 'q1',
        question_text: 'Comment évaluez-vous votre satisfaction globale ?',
        question_type: 'likert',
        options: [],
        is_required: true
      }
    ],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    sent_to: ['RH', 'Finance', 'IT']
  },
  {
    id: 'demo-2',
    title: 'Évaluation annuelle des compétences',
    description: 'Bilan des compétences techniques et soft skills de l\'équipe',
    isAnonymous: false,
    status: 'draft',
    questions: [],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    sent_to: []
  },
  {
    id: 'demo-3',
    title: 'Feedback management 2023',
    description: 'Retour d\'expérience sur le management de l\'année écoulée',
    isAnonymous: true,
    status: 'closed',
    questions: [],
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    sent_to: ['Tous les départements']
  }
]

export const useSurveyStore = defineStore('survey', () => {
  const surveys = ref<Survey[]>([])
  const responses = ref<SurveyResponse[]>([])

  const loadFromStorage = () => {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        surveys.value = JSON.parse(saved)
      } else {
        surveys.value = initialData
        saveToStorage()
      }
    } catch {
      surveys.value = initialData
    }
  }

  const loadResponsesFromStorage = () => {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(RESPONSES_STORAGE_KEY)
      if (saved) {
        responses.value = JSON.parse(saved)
      } else {
        responses.value = []
        saveResponsesToStorage()
      }
    } catch {
      responses.value = []
    }
  }

  const saveToStorage = () => {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys.value))
  }

  const saveResponsesToStorage = () => {
    if (!process.client) return
    localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(responses.value))
  }

  const createSurvey = (data: Omit<Survey, 'id' | 'created_at' | 'sent_to'>) => {
    const survey: Survey = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      sent_to: []
    }
    surveys.value.unshift(survey)
    saveToStorage()
    return survey
  }

  const updateSurvey = (id: string, data: Partial<Survey>) => {
    const index = surveys.value.findIndex(s => s.id === id)
    if (index !== -1) {
      surveys.value[index] = { ...surveys.value[index], ...data }
      saveToStorage()
    }
  }

  const deleteSurvey = (id: string) => {
    surveys.value = surveys.value.filter(s => s.id !== id)
    saveToStorage()
  }

  const sendSurvey = (id: string, departments: string[]) => {
    updateSurvey(id, { status: 'active', sent_to: departments })
  }

  const getSurveyById = (id: string) => {
    return surveys.value.find(s => s.id === id) || null
  }

  // 📝 Survey Responses Management
  const submitResponse = (survey_id: string, employee_id: string, answers: Record<string, any>) => {
    const existingResponse = responses.value.find(
      r => r.survey_id === survey_id && r.employee_id === employee_id
    )

    if (existingResponse) {
      existingResponse.answers = answers
      existingResponse.status = 'submitted'
      existingResponse.submitted_at = new Date().toISOString()
    } else {
      const response: SurveyResponse = {
        id: crypto.randomUUID(),
        survey_id,
        employee_id,
        answers,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      }
      responses.value.push(response)
    }

    saveResponsesToStorage()
  }

  const saveResponseDraft = (survey_id: string, employee_id: string, answers: Record<string, any>) => {
    const existingResponse = responses.value.find(
      r => r.survey_id === survey_id && r.employee_id === employee_id
    )

    if (existingResponse) {
      existingResponse.answers = answers
    } else {
      const response: SurveyResponse = {
        id: crypto.randomUUID(),
        survey_id,
        employee_id,
        answers,
        submitted_at: new Date().toISOString(),
        status: 'draft'
      }
      responses.value.push(response)
    }

    saveResponsesToStorage()
  }

  const getResponseByEmployeeAndSurvey = (survey_id: string, employee_id: string) => {
    return responses.value.find(
      r => r.survey_id === survey_id && r.employee_id === employee_id
    ) || null
  }

  const hasEmployeeResponded = (survey_id: string, employee_id: string) => {
    return responses.value.some(
      r => r.survey_id === survey_id && r.employee_id === employee_id && r.status === 'submitted'
    )
  }

  const getEmployeeSurveys = (employee_id: string) => {
    return surveys.value.filter(s => s.status === 'active')
  }

  // 📊 Récupérer les réponses de l'employé
  const getEmployeeResponses = (employee_id: string) => {
    return responses.value.filter(r => r.employee_id === employee_id)
  }

  const getEmployeeSubmittedResponses = (employee_id: string) => {
    return responses.value.filter(
      r => r.employee_id === employee_id && r.status === 'submitted'
    )
  }

  const getEmployeeDraftResponses = (employee_id: string) => {
    return responses.value.filter(
      r => r.employee_id === employee_id && r.status === 'draft'
    )
  }

  const getSurveyWithResponse = (survey_id: string, employee_id: string) => {
    const survey = surveys.value.find(s => s.id === survey_id)
    const response = responses.value.find(
      r => r.survey_id === survey_id && r.employee_id === employee_id
    )
    return survey
      ? {
          survey,
          response: response || null,
          isSubmitted: response?.status === 'submitted' || false,
          isDraft: response?.status === 'draft' || false
        }
      : null
  }

  const submitDraftResponse = (survey_id: string, employee_id: string) => {
    const response = responses.value.find(
      r => r.survey_id === survey_id && r.employee_id === employee_id
    )
    if (response && response.status === 'draft') {
      response.status = 'submitted'
      response.submitted_at = new Date().toISOString()
      saveResponsesToStorage()
      return true
    }
    return false
  }

  const activeSurveys = computed(() => surveys.value.filter(s => s.status === 'active'))
  const draftSurveys = computed(() => surveys.value.filter(s => s.status === 'draft'))
  const closedSurveys = computed(() => surveys.value.filter(s => s.status === 'closed'))

  return {
    surveys,
    responses,
    activeSurveys,
    draftSurveys,
    closedSurveys,
    loadFromStorage,
    loadResponsesFromStorage,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    sendSurvey,
    getSurveyById,
    submitResponse,
    saveResponseDraft,
    getResponseByEmployeeAndSurvey,
    hasEmployeeResponded,
    getEmployeeSurveys,
    getEmployeeResponses,
    getEmployeeSubmittedResponses,
    getEmployeeDraftResponses,
    getSurveyWithResponse,
    submitDraftResponse
  }
})
