import { defineStore } from 'pinia'

export interface Formation {
  id: string
  title: string
  description: string
  category: string
  duration: string
  level: 'débutant' | 'intermédiaire' | 'avancé'
  status: 'disponible' | 'en_cours' | 'terminée'
  departments: string[]
  created_at: string
  participants: number
}

export interface FormationRegistration {
  id: string
  formation_id: string
  employee_id: string
  registered_at: string
  status: 'inscrit' | 'en_cours' | 'complété'
  completion_date?: string
}

const STORAGE_KEY = 'grh_formations'
const REGISTRATIONS_STORAGE_KEY = 'grh_formation_registrations'

const initialData: Formation[] = [
  {
    id: 'f1',
    title: 'Excel Avancé',
    description: 'Maîtrisez les fonctions avancées d\'Excel pour améliorer votre productivité et réaliser des analyses complexes.',
    category: 'Informatique',
    duration: '2 jours',
    level: 'avancé',
    status: 'disponible',
    departments: ['Finance', 'RH'],
    created_at: new Date().toISOString(),
    participants: 32
  },
  {
    id: 'f2',
    title: 'Management d\'équipe',
    description: 'Techniques de management et leadership pour les responsables d\'équipe. Apprenez à motiver et développer votre équipe.',
    category: 'Management',
    duration: '3 jours',
    level: 'intermédiaire',
    status: 'en_cours',
    departments: ['Tous les départements'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    participants: 25
  },
  {
    id: 'f3',
    title: 'Communication professionnelle',
    description: 'Améliorer la communication interne et externe dans l\'entreprise. Techniques d\'expression orale et écrite.',
    category: 'Soft Skills',
    duration: '1 jour',
    level: 'débutant',
    status: 'disponible',
    departments: ['Commercial', 'RH', 'Direction'],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    participants: 18
  },
  {
    id: 'f4',
    title: 'Gestion de projet Agile',
    description: 'Méthodologies Scrum et Kanban pour gérer des projets efficacement. Certification possible en fin de formation.',
    category: 'Management',
    duration: '4 jours',
    level: 'intermédiaire',
    status: 'disponible',
    departments: ['IT', 'Commercial'],
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    participants: 15
  },
  {
    id: 'f5',
    title: 'Sécurité informatique',
    description: 'Sensibilisation aux bonnes pratiques en cybersécurité. Protection des données et prévention des risques.',
    category: 'Informatique',
    duration: '1 jour',
    level: 'débutant',
    status: 'terminée',
    departments: ['Tous les départements'],
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    participants: 47
  }
]

export const useFormationStore = defineStore('formation', () => {
  const formations = ref<Formation[]>([])
  const registrations = ref<FormationRegistration[]>([])

  const loadFromStorage = () => {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        formations.value = JSON.parse(saved)
      } else {
        formations.value = initialData
        saveToStorage()
      }
    } catch {
      formations.value = initialData
    }
  }

  const loadRegistrationsFromStorage = () => {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(REGISTRATIONS_STORAGE_KEY)
      if (saved) {
        registrations.value = JSON.parse(saved)
      } else {
        registrations.value = []
        saveRegistrationsToStorage()
      }
    } catch {
      registrations.value = []
    }
  }

  const saveToStorage = () => {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formations.value))
  }

  const saveRegistrationsToStorage = () => {
    if (!process.client) return
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations.value))
  }

  const createFormation = (data: Omit<Formation, 'id' | 'created_at'>) => {
    const formation: Formation = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }
    formations.value.unshift(formation)
    saveToStorage()
    return formation
  }

  const updateFormation = (id: string, data: Partial<Formation>) => {
    const index = formations.value.findIndex(f => f.id === id)
    if (index !== -1) {
      formations.value[index] = { ...formations.value[index], ...data }
      saveToStorage()
    }
  }

  const deleteFormation = (id: string) => {
    formations.value = formations.value.filter(f => f.id !== id)
    saveToStorage()
  }

  const getFormationById = (id: string) => {
    return formations.value.find(f => f.id === id) || null
  }

  // 📚 Formation Registration Management
  const registerForFormation = (formation_id: string, employee_id: string) => {
    const existingReg = registrations.value.find(
      r => r.formation_id === formation_id && r.employee_id === employee_id
    )

    if (!existingReg) {
      const registration: FormationRegistration = {
        id: crypto.randomUUID(),
        formation_id,
        employee_id,
        registered_at: new Date().toISOString(),
        status: 'inscrit'
      }
      registrations.value.push(registration)
      saveRegistrationsToStorage()
      return registration
    }
    return null
  }

  const unregisterFromFormation = (formation_id: string, employee_id: string) => {
    registrations.value = registrations.value.filter(
      r => !(r.formation_id === formation_id && r.employee_id === employee_id)
    )
    saveRegistrationsToStorage()
  }

  const isEmployeeRegistered = (formation_id: string, employee_id: string) => {
    return registrations.value.some(
      r => r.formation_id === formation_id && r.employee_id === employee_id
    )
  }

  const getEmployeeFormations = (employee_id: string) => {
    const employeeRegIds = registrations.value
      .filter(r => r.employee_id === employee_id)
      .map(r => r.formation_id)
    return formations.value.filter(f => employeeRegIds.includes(f.id))
  }

  const getFormationRegistrations = (formation_id: string) => {
    return registrations.value.filter(r => r.formation_id === formation_id)
  }

  const updateRegistrationStatus = (registration_id: string, status: 'inscrit' | 'en_cours' | 'complété') => {
    const reg = registrations.value.find(r => r.id === registration_id)
    if (reg) {
      reg.status = status
      if (status === 'complété') {
        reg.completion_date = new Date().toISOString()
      }
      saveRegistrationsToStorage()
    }
  }

  const availableFormations = computed(() => formations.value.filter(f => f.status === 'disponible'))
  const ongoingFormations = computed(() => formations.value.filter(f => f.status === 'en_cours'))

  return {
    formations,
    registrations,
    availableFormations,
    ongoingFormations,
    loadFromStorage,
    loadRegistrationsFromStorage,
    createFormation,
    updateFormation,
    deleteFormation,
    getFormationById,
    registerForFormation,
    unregisterFromFormation,
    isEmployeeRegistered,
    getEmployeeFormations,
    getFormationRegistrations,
    updateRegistrationStatus
  }
})
