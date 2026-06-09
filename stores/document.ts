import { defineStore } from 'pinia'

export interface Document {
  id: string
  userId: string
  name: string
  type: 'contrat' | 'diplome' | 'attestation' | 'bulletin_salaire' | 'piece_identite' | 'autre'
  mimetype: string
  size: number
  uploadedBy: string
  createdAt: string
}

export const useDocumentStore = defineStore('document', () => {
  const config   = useRuntimeConfig()
  const documents = ref<Document[]>([])
  const loading   = ref(false)
  const uploading = ref(false)

  const getToken = () =>
    import.meta.client ? localStorage.getItem('auth_token') : null

  const authHeaders = (): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const api = (path: string, opts: Record<string, any> = {}) =>
    $fetch<any>(`${config.public.apiBase}${path}`, {
      headers: authHeaders(),
      ...opts
    })

  // ── Charger les documents d'un employé ─────────────────────────────────────
  const fetchDocuments = async (userId: string) => {
    loading.value = true
    try {
      const res = await api(`/documents?userId=${userId}`)
      documents.value = res.data as Document[]
    } catch (e) {
      console.error('Erreur chargement documents:', e)
      documents.value = []
    } finally {
      loading.value = false
    }
  }

  // ── Upload (multipart/form-data) ────────────────────────────────────────────
  const uploadDocument = async (
    file: File,
    userId: string,
    type: Document['type']
  ): Promise<Document> => {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('type', type)
      const res = await api('/documents', { method: 'POST', body: formData })
      const doc = res.data as Document
      documents.value.unshift(doc)
      return doc
    } finally {
      uploading.value = false
    }
  }

  // ── Télécharger le fichier (stream binaire) ─────────────────────────────────
  const downloadDocument = async (id: string, name: string) => {
    const token = getToken()
    const response = await fetch(`${config.public.apiBase}/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!response.ok) throw new Error('Téléchargement impossible')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = name
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── Supprimer ───────────────────────────────────────────────────────────────
  const deleteDocument = async (id: string) => {
    await api(`/documents/${id}`, { method: 'DELETE' })
    documents.value = documents.value.filter(d => d.id !== id)
  }

  return {
    documents, loading, uploading,
    fetchDocuments, uploadDocument, downloadDocument, deleteDocument
  }
})
