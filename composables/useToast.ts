interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'destructive'
  duration?: number
}

const toasts = ref<Toast[]>([])
const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = crypto.randomUUID()
  const newToast = { id, ...toast }
  
  toasts.value = [newToast, ...toasts.value].slice(0, TOAST_LIMIT)
  
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, toast.duration || TOAST_REMOVE_DELAY)
  
  return newToast
}

const dismissToast = (id: string) => {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

const toast = {
  success: (title: string, description?: string) => addToast({ title, description, variant: 'success' }),
  error: (title: string, description?: string) => addToast({ title, description, variant: 'destructive' }),
  default: (title: string, description?: string) => addToast({ title, description }),
  dismiss: dismissToast
}

export const useToast = () => ({
  toasts: readonly(toasts),
  ...toast
})
