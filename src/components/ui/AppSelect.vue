<template>
  <div ref="rootRef" :class="['app-select', { open: open, 'select-modal': modal }]" @keydown.esc="closeMenu">
    <button
      ref="triggerRef"
      :class="['select-trigger', triggerClass, { placeholder: !selectedOption }]"
      type="button"
      :aria-expanded="open ? 'true' : 'false'"
      @click="toggleMenu"
    >
      <span class="select-label">{{ selectedOption?.label || placeholder }}</span>
      <ChevronDown :class="['select-caret', { rotated: open }]" :size="18" />
    </button>

    <transition name="select-menu-fade">
      <div v-if="open" :class="['select-menu', menuClass]" role="listbox">
        <button
          v-for="option in options"
          :key="String(option.value)"
          :class="['select-option', { active: option.value === modelValue }]"
          type="button"
          @click="selectOption(option.value)"
        >
          <span>{{ option.label }}</span>
          <Check v-if="option.value === modelValue" :size="16" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  modal: {
    type: Boolean,
    default: false
  },
  triggerClass: {
    type: [String, Array, Object],
    default: ''
  },
  menuClass: {
    type: [String, Array, Object],
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const triggerRef = ref(null)
const open = ref(false)

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))

const closeMenu = () => {
  open.value = false
}

const toggleMenu = () => {
  open.value = !open.value
}

const selectOption = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
  closeMenu()
}

const handleDocumentClick = (event) => {
  if (!rootRef.value?.contains(event.target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentClick)
})
</script>

<style scoped lang="scss">
.app-select {
  position: relative;
  z-index: 1;
}

.app-select.open {
  z-index: 90;
}

.select-trigger {
  width: 100%;
  min-height: 50px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--glass-stroke);
  border-radius: 18px;
  background: var(--glass-elevated);
  color: var(--text-primary);
  transition:
    border-color var(--motion-fast),
    box-shadow var(--motion-fast),
    background var(--motion-fast),
    transform var(--motion-fast);
}

.select-trigger:hover {
  border-color: var(--accent-border);
}

.open .select-trigger {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 4px rgba(92, 126, 255, 0.12);
  background: var(--select-trigger-open);
}

.select-trigger.placeholder .select-label {
  color: var(--text-muted);
}

.select-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-caret {
  flex: none;
  color: var(--text-secondary);
  transition: transform var(--motion-fast), color var(--motion-fast);
}

.select-caret.rotated {
  transform: rotate(180deg);
  color: var(--text-primary);
}

.select-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  z-index: 95;
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--select-menu-border);
  border-radius: 22px;
  background: var(--select-menu-surface);
  box-shadow: var(--select-menu-shadow);
  backdrop-filter: blur(24px) saturate(1.15);
  transform-origin: top center;
}

.select-modal .select-menu {
  background: var(--select-menu-surface-modal);
  border-color: var(--select-menu-border-modal);
  box-shadow: var(--select-menu-shadow-modal);
}

.select-option {
  min-height: 42px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  transition:
    background var(--motion-fast),
    border-color var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
}

.select-option:hover {
  transform: translateX(2px);
  border-color: var(--select-item-border-hover);
  background: var(--select-item-hover);
  color: var(--text-primary);
}

.select-option.active {
  border-color: var(--select-item-border-active);
  background: var(--select-item-active);
  color: var(--text-primary);
}

.select-menu-fade-enter-active,
.select-menu-fade-leave-active {
  transition: opacity var(--motion-fast), transform var(--motion-fast);
}

.select-menu-fade-enter-from,
.select-menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
