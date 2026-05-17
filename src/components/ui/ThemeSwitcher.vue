<template>
  <div :class="['theme-switcher', { 'compact-on-mobile': compactOnMobile }]">
    <button
      v-for="option in options"
      :key="option.value"
      :class="['theme-chip', { active: modelValue === option.value }]"
      type="button"
      :title="option.label"
      :aria-label="`切换到${option.label}主题`"
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" :size="15" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    default: () => []
  },
  compactOnMobile: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped lang="scss">
.theme-switcher {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding: 4px;
  border: 1px solid var(--glass-border-strong);
  border-radius: 999px;
  background: var(--glass-surface-strong);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: var(--shadow-soft);
}

.theme-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  min-width: 78px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast),
    box-shadow var(--motion-fast);
}

.theme-chip:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
}

.theme-chip.active {
  background: var(--accent-soft);
  color: var(--text-primary);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 8px 18px rgba(33, 52, 95, 0.12);
}

.theme-chip span {
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 760px) {
  .theme-switcher.compact-on-mobile {
    width: auto;
    padding: 3px;
  }

  .theme-switcher.compact-on-mobile .theme-chip {
    min-width: 34px;
    width: 34px;
    min-height: 34px;
    padding: 0;
    gap: 0;
  }

  .theme-switcher.compact-on-mobile .theme-chip span {
    display: none;
  }

  .theme-switcher:not(.compact-on-mobile) {
    width: 100%;
  }

  .theme-chip {
    min-width: 0;
  }

  .theme-chip span {
    font-size: 12px;
  }
}
</style>
