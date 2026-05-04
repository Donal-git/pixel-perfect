<script setup lang="ts">
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: { value: number; positive: boolean }
  class?: string
}
const props = defineProps<StatCardProps>()
</script>

<template>
  <div :class="cn('stat-card', props.class)">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ props.title }}</p>
        <p class="mt-2 text-3xl font-bold text-foreground">{{ props.value }}</p>
        <p v-if="props.description" class="mt-1 text-xs text-muted-foreground">{{ props.description }}</p>
        <p 
          v-if="props.trend" 
          :class="cn('mt-1 text-xs font-medium', props.trend.positive ? 'text-success' : 'text-destructive')"
        >
          {{ props.trend.positive ? '↑' : '↓' }} {{ Math.abs(props.trend.value) }}%
        </p>
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <slot name="icon" />
      </div>
    </div>
  </div>
</template>

