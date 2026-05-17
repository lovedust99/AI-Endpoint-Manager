<template>
  <div ref="rootRef" :class="['app-combobox', { open: open, 'combobox-modal': modal }]">
    <div class="combobox-trigger">
      <input
        ref="inputRef"
        :value="modelValue"
        :placeholder="placeholder"
        :class="['glass-input', inputClass]"
        @input="handleInput"
        @focus="openMenu"
        @keydown.down.prevent="openMenu"
        @keydown.esc="closeMenu"
      />
      <button
        class="combobox-caret"
        type="button"
        aria-label="展开建议列表"
        @click="toggleMenu"
      >
        <ChevronDown :class="{ rotated: open }" :size="18" />
      </button>
    </div>

    <transition name="select-menu-fade">
      <div v-if="open && filteredOptions.length" :class="['combobox-menu', menuClass]">
        <button
          v-for="option in filteredOptions"
          :key="option"
          :class="['combobox-option', { active: isSelected(option) }]"
          type="button"
          @click="chooseOption(option)"
        >
          <span>{{ option }}</span>
          <Check v-if="isSelected(option)" :size="16" />
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
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  selectedValues: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: ''
  },
  multiple: {
    type: Boolean,
    default: false
  },
  modal: {
    type: Boolean,
    default: false
  },
  inputClass: {
    type: [String, Array, Object],
    default: ''
  },
  menuClass: {
    type: [String, Array, Object],
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const rootRef = ref(null)
const inputRef = ref(null)
const open = ref(false)

const filteredOptions = computed(() => {
  const keyword = props.modelValue.trim().toLowerCase()
  const normalized = props.options.filter(Boolean)
  if (!keyword) return normalized
  return normalized.filter((item) => item.toLowerCase().includes(keyword))
})

const openMenu = () => {
  open.value = true
}

const closeMenu = () => {
  open.value = false
}

const toggleMenu = () => {
  open.value = !open.value
  if (open.value) inputRef.value?.focus()
}

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
  openMenu()
}

const isSelected = (option) => props.multiple
  ? props.selectedValues.includes(option)
  : option === props.modelValue

const chooseOption = (option) => {
  emit('select', option)
  if (props.multiple) {
    emit('update:modelValue', '')
    openMenu()
  } else {
    emit('update:modelValue', option)
    closeMenu()
  }
  inputRef.value?.focus()
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
.app-combobox {
  position: relative;
}

.combobox-trigger {
  position: relative;
}

.combobox-trigger :deep(.glass-input) {
  padding-right: 48px;
}

.open .combobox-trigger :deep(.glass-input) {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 4px rgba(92, 126, 255, 0.12);
  background: var(--select-trigger-open);
}

.combobox-caret {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary);
  transform: translateY(-50%);
}

.combobox-caret :deep(svg) {
  transition: transform var(--motion-fast), color var(--motion-fast);
}

.combobox-caret .rotated {
  transform: rotate(180deg);
  color: var(--text-primary);
}

.combobox-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  z-index: 12;
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--select-menu-border-modal);
  border-radius: 22px;
  background: var(--select-menu-surface-modal);
  box-shadow: var(--select-menu-shadow-modal);
  backdrop-filter: blur(24px) saturate(1.15);
}

.combobox-option {
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

.combobox-option:hover {
  transform: translateX(2px);
  border-color: var(--select-item-border-hover);
  background: var(--select-item-hover);
  color: var(--text-primary);
}

.combobox-option.active {
  border-color: var(--select-item-border-active);
  background: var(--select-item-active);
  color: var(--text-primary);
}
</style>
