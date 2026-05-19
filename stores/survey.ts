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

export const useSurveyStore = defineStore('survey', () => {
  const config    = useRuntimeConfig()
  const surveys   = ref<Survey[]>([])
  const responses = ref<SurveyResponse[]>([])
  const loading   = ref(false)

  const headers = (): Record<string, string> => {
    const token = import.meta.client ? localStorage.getItem('auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // const api = (path: string, opts: Record<string, any> = {}) =>
  //   $fetch<any>(`${config.public.apiBase}${path}`, { headers: headers(), ...opts })

  const api = async (path: string, opts: Record<string, any> = {}) => {
  try {
    return await $fetch<any>(`${config.public.apiBase}${path}`, {
      headers: headers(),
      ...opts
    })
  } catch (error: any) {
    console.error("❌ API ERROR:", {
      url: path,
      status: error?.response?.status,
      message: error?.message,
      data: error?.response?._data
    })

    throw error
  }
}

  // ── Load surveys from API ───────────────────────────────────────────────────
  // const loadFromStorage = async () => {
  //   if (!import.meta.client) return
  //   loading.value = true
  //   try {
  //     const res = await api('/surveys')
  //     surveys.value = res.data as Survey[]
  //   } catch (e) {
  //     console.error('Erreur chargement sondages:', e)
  //   } finally {
  //     loading.value = false
  //   }
  // }


const loadFromStorage = async () => {
  if (!import.meta.client) return

  loading.value = true

  try {
    const res = await api('/surveys')

    surveys.value = res.data ?? res

  } catch (e) {
    console.error('❌ Erreur chargement sondages:', e)
  } finally {
    loading.value = false
  }
}


  const loadResponsesFromStorage = async () => {
    if (!import.meta.client) return
    try {
      const res = await api('/surveys/responses/mine')
      responses.value = res.data as SurveyResponse[]
    } catch (e) {
      console.error('Erreur chargement réponses:', e)
    }
  }

  // ── CRUD surveys ────────────────────────────────────────────────────────────
  const createSurvey = async (data: Omit<Survey, 'id' | 'created_at' | 'sent_to'>) => {
    const res = await api('/surveys', { method: 'POST', body: data })
    const survey = res.data as Survey
    surveys.value.unshift(survey)
    return survey
  }

  const updateSurvey = async (id: string, data: Partial<Survey>) => {
    const res = await api(`/surveys/${id}`, { method: 'PUT', body: data })
    const updated = res.data as Survey
    const idx = surveys.value.findIndex(s => s.id === id)
    if (idx !== -1) surveys.value[idx] = updated
  }

  const deleteSurvey = async (id: string) => {
    await api(`/surveys/${id}`, { method: 'DELETE' })
    surveys.value = surveys.value.filter(s => s.id !== id)
  }

  const sendSurvey = async (id: string, departments: string[]) => {
    const res = await api(`/surveys/${id}/send`, { method: 'POST', body: { departments } })
    const updated = res.data as Survey
    const idx = surveys.value.findIndex(s => s.id === id)
    if (idx !== -1) surveys.value[idx] = updated
  }

  const getSurveyById = (id: string) => surveys.value.find(s => s.id === id) || null

  // ── Responses ───────────────────────────────────────────────────────────────
  const submitResponse = async (survey_id: string, employee_id: string, answers: Record<string, any>) => {
    const res = await api(`/surveys/${survey_id}/responses`, {
      method: 'POST',
      body: { answers, status: 'submitted' }
    })
    const response = res.data as SurveyResponse
    const idx = responses.value.findIndex(r => r.survey_id === survey_id && r.employee_id === employee_id)
    if (idx !== -1) responses.value[idx] = response
    else responses.value.push(response)
  }

  const saveResponseDraft = async (survey_id: string, employee_id: string, answers: Record<string, any>) => {
    const res = await api(`/surveys/${survey_id}/responses`, {
      method: 'POST',
      body: { answers, status: 'draft' }
    })
    const response = res.data as SurveyResponse
    const idx = responses.value.findIndex(r => r.survey_id === survey_id && r.employee_id === employee_id)
    if (idx !== -1) responses.value[idx] = response
    else responses.value.push(response)
  }

  const getResponseByEmployeeAndSurvey = (survey_id: string, employee_id: string) =>
    responses.value.find(r => r.survey_id === survey_id && r.employee_id === employee_id) || null

  const hasEmployeeResponded = (survey_id: string, employee_id: string) =>
    responses.value.some(r => r.survey_id === survey_id && r.employee_id === employee_id && r.status === 'submitted')

  // Returns active surveys — visible to all employees regardless of their ID
  const getEmployeeSurveys = () =>
    surveys.value.filter(s => s.status === 'active')

  const getEmployeeResponses = (employee_id: string) =>
    responses.value.filter(r => r.employee_id === employee_id)

  const getEmployeeSubmittedResponses = (employee_id: string) =>
    responses.value.filter(r => r.employee_id === employee_id && r.status === 'submitted')

  const getEmployeeDraftResponses = (employee_id: string) =>
    responses.value.filter(r => r.employee_id === employee_id && r.status === 'draft')

  const getSurveyWithResponse = (survey_id: string, employee_id: string) => {
    const survey   = surveys.value.find(s => s.id === survey_id)
    const response = responses.value.find(r => r.survey_id === survey_id && r.employee_id === employee_id)
    return survey
      ? { survey, response: response || null, isSubmitted: response?.status === 'submitted' || false, isDraft: response?.status === 'draft' || false }
      : null
  }

  const submitDraftResponse = async (survey_id: string, employee_id: string) => {
    const existing = responses.value.find(r => r.survey_id === survey_id && r.employee_id === employee_id)
    if (existing && existing.status === 'draft') {
      await api(`/surveys/${survey_id}/responses`, {
        method: 'POST',
        body: { answers: existing.answers, status: 'submitted' }
      })
      existing.status = 'submitted'
      return true
    }
    return false
  }

  const activeSurveys = computed(() => surveys.value.filter(s => s.status === 'active'))
  const draftSurveys  = computed(() => surveys.value.filter(s => s.status === 'draft'))
  const closedSurveys = computed(() => surveys.value.filter(s => s.status === 'closed'))

  return {
    surveys, responses, loading,
    activeSurveys, draftSurveys, closedSurveys,
    loadFromStorage, loadResponsesFromStorage,
    createSurvey, updateSurvey, deleteSurvey, sendSurvey, getSurveyById,
    submitResponse, saveResponseDraft, getResponseByEmployeeAndSurvey,
    hasEmployeeResponded, getEmployeeSurveys,
    getEmployeeResponses, getEmployeeSubmittedResponses, getEmployeeDraftResponses,
    getSurveyWithResponse, submitDraftResponse
  }
})
