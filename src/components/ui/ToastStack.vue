<template>
  <transition-group name="toast-list" tag="div" class="toast-stack">
    <article
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast-card', `toast-${toast.tone}`]"
    >
      <div class="toast-copy">
        <strong>{{ toast.title }}</strong>
        <p>{{ toast.message }}</p>
      </div>
      <button class="toast-dismiss" type="button" aria-label="关闭通知" @click="$emit('dismiss', toast.id)">
        ×
      </button>
    </article>
  </transition-group>
</template>

<script setup>
defineProps({
  toasts: {
    type: Array,
    default: () => []
  }
})

defineEmits(['dismiss'])
</script>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 70;
  display: grid;
  gap: 12px;
  width: min(360px, calc(100vw - 32px));
}

.toast-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 16px 16px 18px;
  border: 1px solid var(--glass-border-strong);
  border-radius: 22px;
  background: var(--glass-surface-strong);
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(18px);
}

.toast-copy {
  display: grid;
  gap: 4px;
}

.toast-copy strong {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.25;
}

.toast-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.toast-dismiss {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.toast-success {
  box-shadow: inset 0 0 0 1px rgba(85, 196, 131, 0.24), var(--shadow-float);
}

.toast-warning {
  box-shadow: inset 0 0 0 1px rgba(255, 182, 72, 0.24), var(--shadow-float);
}

.toast-danger,
.toast-error {
  box-shadow: inset 0 0 0 1px rgba(255, 110, 110, 0.24), var(--shadow-float);
}

.toast-list-enter-active,
.toast-list-leave-active,
.toast-list-move {
  transition: all var(--motion-base);
}

.toast-list-enter-from,
.toast-list-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}

.toast-list-leave-active {
  position: absolute;
}

@media (max-width: 760px) {
  .toast-stack {
    top: 14px;
    right: 14px;
  }
}
</style>
