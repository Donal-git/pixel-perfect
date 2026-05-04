import { defineStore } from 'pinia'

export interface PersonnelMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'grh' | 'employee'
  department: string
  position: string
  phone: string
  status: 'actif' | 'inactif'
  registeredAt: string
}

const STORAGE_KEY = 'grh_personnel'

const initialData: PersonnelMember[] = [
  {
    id: 'p1',
    name: 'Marie Dupont',
    email: 'marie.dupont@entreprise.com',
    role: 'admin',
    department: 'Direction',
    position: 'Directrice Générale',
    phone: '+226 70 00 00 01',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 120).toISOString()
  },
  {
    id: 'p2',
    name: 'Jean Kaboré',
    email: 'jean.kabore@entreprise.com',
    role: 'grh',
    department: 'RH',
    position: 'Responsable RH',
    phone: '+226 70 00 00 02',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 90).toISOString()
  },
  {
    id: 'p3',
    name: 'Awa Ouédraogo',
    email: 'awa.ouedraogo@entreprise.com',
    role: 'employee',
    department: 'IT',
    position: 'Développeuse Senior',
    phone: '+226 70 00 00 03',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 80).toISOString()
  },
  {
    id: 'p4',
    name: 'Moussa Traoré',
    email: 'moussa.traore@entreprise.com',
    role: 'employee',
    department: 'Finance',
    position: 'Comptable Principal',
    phone: '+226 70 00 00 04',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 75).toISOString()
  },
  {
    id: 'p5',
    name: 'Fatima Coulibaly',
    email: 'fatima.coulibaly@entreprise.com',
    role: 'employee',
    department: 'Commercial',
    position: 'Responsable Commerciale',
    phone: '+226 70 00 00 05',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 60).toISOString()
  },
  {
    id: 'p6',
    name: 'Ibrahim Sawadogo',
    email: 'ibrahim.sawadogo@entreprise.com',
    role: 'employee',
    department: 'Production',
    position: "Chef d'Atelier",
    phone: '+226 70 00 00 06',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 55).toISOString()
  },
  {
    id: 'p7',
    name: 'Aissata Diallo',
    email: 'aissata.diallo@entreprise.com',
    role: 'employee',
    department: 'Marketing',
    position: 'Chargée Marketing Digital',
    phone: '+226 70 00 00 07',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 50).toISOString()
  },
  {
    id: 'p8',
    name: 'Drissa Konaté',
    email: 'drissa.konate@entreprise.com',
    role: 'grh',
    department: 'Logistique',
    position: 'Responsable Logistique',
    phone: '+226 70 00 00 08',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 45).toISOString()
  },
  {
    id: 'p9',
    name: 'Salimata Barro',
    email: 'salimata.barro@entreprise.com',
    role: 'employee',
    department: 'RH',
    position: 'Assistante RH',
    phone: '+226 70 00 00 09',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 40).toISOString()
  },
  {
    id: 'p10',
    name: 'Abdoul Ndiaye',
    email: 'abdoul.ndiaye@entreprise.com',
    role: 'employee',
    department: 'IT',
    position: 'Administrateur Systèmes',
    phone: '+226 70 00 00 10',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 35).toISOString()
  },
  {
    id: 'p11',
    name: 'Kadiatou Sow',
    email: 'kadiatou.sow@entreprise.com',
    role: 'employee',
    department: 'Finance',
    position: 'Analyste Financière',
    phone: '+226 70 00 00 11',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 30).toISOString()
  },
  {
    id: 'p12',
    name: 'Bakary Koné',
    email: 'bakary.kone@entreprise.com',
    role: 'employee',
    department: 'Commercial',
    position: 'Commercial Terrain',
    phone: '+226 70 00 00 12',
    status: 'inactif',
    registeredAt: new Date(Date.now() - 86400000 * 25).toISOString()
  },
  {
    id: 'p13',
    name: 'Mariama Camara',
    email: 'mariama.camara@entreprise.com',
    role: 'employee',
    department: 'Direction',
    position: 'Secrétaire de Direction',
    phone: '+226 70 00 00 13',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 20).toISOString()
  },
  {
    id: 'p14',
    name: 'Lamine Doumbia',
    email: 'lamine.doumbia@entreprise.com',
    role: 'employee',
    department: 'Production',
    position: 'Opérateur de Production',
    phone: '+226 70 00 00 14',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 15).toISOString()
  },
  {
    id: 'p15',
    name: 'Rokiatou Fofana',
    email: 'rokiatou.fofana@entreprise.com',
    role: 'employee',
    department: 'Marketing',
    position: 'Designer Graphique',
    phone: '+226 70 00 00 15',
    status: 'actif',
    registeredAt: new Date(Date.now() - 86400000 * 10).toISOString()
  }
]

export const usePersonnelStore = defineStore('personnel', () => {
  const members = ref<PersonnelMember[]>([])

  const loadFromStorage = () => {
    if (!process.client) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        members.value = JSON.parse(saved)
      } else {
        members.value = initialData
        saveToStorage()
      }
    } catch {
      members.value = initialData
    }
  }

  const saveToStorage = () => {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members.value))
  }

  const addMember = (data: Omit<PersonnelMember, 'id' | 'registeredAt'>) => {
    const member: PersonnelMember = {
      ...data,
      id: crypto.randomUUID(),
      registeredAt: new Date().toISOString()
    }
    members.value.unshift(member)
    saveToStorage()
    return member
  }

  const updateMember = (id: string, data: Partial<PersonnelMember>) => {
    const idx = members.value.findIndex(m => m.id === id)
    if (idx !== -1) {
      members.value[idx] = { ...members.value[idx], ...data }
      saveToStorage()
    }
  }

  const deleteMember = (id: string) => {
    members.value = members.value.filter(m => m.id !== id)
    saveToStorage()
  }

  const toggleStatus = (id: string) => {
    const m = members.value.find(m => m.id === id)
    if (m) {
      m.status = m.status === 'actif' ? 'inactif' : 'actif'
      saveToStorage()
    }
  }

  const getMemberById = (id: string) => members.value.find(m => m.id === id) ?? null

  // Aliases for consistency
  const getPersonnelById = (id: string) => getMemberById(id)
  const updatePersonnel = (id: string, data: Partial<PersonnelMember>) => updateMember(id, data)

  const byDepartment = computed(() => {
    const map: Record<string, number> = {}
    for (const m of members.value) {
      map[m.department] = (map[m.department] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count)
  })

  return {
    members,
    byDepartment,
    loadFromStorage,
    addMember,
    updateMember,
    deleteMember,
    toggleStatus,
    getMemberById,
    getPersonnelById,
    updatePersonnel
  }
})
