const MOBILE_BREAKPOINT = 768

const isMobile = ref(false)

const updateMobile = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

onMounted(() => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobile)
})

export const useMobile = () => isMobile
