<script setup lang="ts">
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-xl"
          :class="{
            'border-green-200 bg-green-50': toast.variant === 'success',
            'border-red-200 bg-red-50': toast.variant === 'destructive',
            'border-gray-200': !toast.variant || toast.variant === 'default'
          }"
        >
          <CheckCircle2
            v-if="toast.variant === 'success'"
            class="mt-0.5 h-5 w-5 shrink-0 text-green-600"
          />
          <AlertCircle
            v-else-if="toast.variant === 'destructive'"
            class="mt-0.5 h-5 w-5 shrink-0 text-red-500"
          />
          <Info
            v-else
            class="mt-0.5 h-5 w-5 shrink-0 text-teal-500"
          />

          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-semibold"
              :class="{
                'text-green-800': toast.variant === 'success',
                'text-red-800': toast.variant === 'destructive',
                'text-gray-900': !toast.variant || toast.variant === 'default'
              }"
            >
              {{ toast.title }}
            </p>
            <p v-if="toast.description" class="mt-0.5 text-xs text-gray-500">
              {{ toast.description }}
            </p>
          </div>

          <button
            @click="dismiss(toast.id)"
            class="ml-1 shrink-0 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease;
}
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
