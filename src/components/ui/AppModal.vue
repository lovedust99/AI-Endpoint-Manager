<template>
  <transition name="modal-fade">
    <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('close')">
      <section :class="['modal-shell', sizeClass]">
        <header class="modal-header">
          <div class="modal-title-wrap">
            <span v-if="eyebrow" class="modal-eyebrow">{{ eyebrow }}</span>
            <h2 class="modal-title">{{ title }}</h2>
            <p v-if="description" class="modal-description">{{ description }}</p>
          </div>
          <button class="modal-close" type="button" aria-label="关闭弹窗" @click="$emit('close')">
            <slot name="close-icon">
              <X :size="18" />
            </slot>
          </button>
        </header>

        <div class="modal-body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  eyebrow: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'lg'
  }
})

defineEmits(['close'])

const sizeClass = computed(() => `modal-${props.size}`)
</script>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 28px 20px;
  background:
    radial-gradient(circle at top, rgba(79, 111, 255, 0.18), transparent 40%),
    rgba(7, 11, 22, 0.52);
  backdrop-filter: blur(18px);
}

.modal-shell {
  width: min(100%, 980px);
  max-height: calc(100vh - 56px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-border-strong);
  border-radius: 32px;
  background: var(--glass-surface-strong);
  box-shadow: var(--shadow-overlay);
}

.modal-sm {
  width: min(100%, 520px);
}

.modal-md {
  width: min(100%, 720px);
}

.modal-lg {
  width: min(100%, 980px);
}

.modal-xl {
  width: min(100%, 1140px);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 26px 28px 20px;
  border-bottom: 1px solid var(--glass-stroke);
}

.modal-title-wrap {
  display: grid;
  gap: 6px;
}

.modal-eyebrow {
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.1;
  color: var(--text-primary);
}

.modal-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.modal-close {
  width: 42px;
  height: 42px;
  padding: 0;
  display: grid;
  place-items: center;
  flex: none;
  border: 1px solid var(--glass-stroke);
  border-radius: 16px;
  background: var(--glass-elevated);
  color: var(--text-primary);
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast);
}

.modal-close :deep(svg) {
  display: block;
}

.modal-close:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border);
  background: var(--glass-surface);
}

.modal-body {
  overflow: auto;
  padding: 24px 28px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px 28px;
  border-top: 1px solid var(--glass-stroke);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--motion-base), transform var(--motion-base);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-shell,
.modal-fade-leave-to .modal-shell {
  transform: translateY(20px) scale(0.97);
}

@media (max-width: 760px) {
  .modal-backdrop {
    padding: 14px;
  }

  .modal-shell {
    max-height: calc(100vh - 28px);
    border-radius: 26px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }
}
</style>
