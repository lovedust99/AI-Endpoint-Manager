<template>
  <AppModal
    :model-value="state.confirmDialog.value.visible"
    :title="state.confirmDialog.value.title || '确认操作'"
    eyebrow="Safety Check"
    size="sm"
    @close="state.settleConfirm(false)"
  >
    <div class="confirm-body">
      <div :class="['confirm-icon', `tone-${state.confirmDialog.value.tone || 'danger'}`]">
        <TriangleAlert :size="22" />
      </div>
      <p>{{ state.confirmDialog.value.message }}</p>
    </div>

    <template #footer>
      <button class="glass-button button-secondary" type="button" @click="state.settleConfirm(false)">
        {{ state.confirmDialog.value.cancelText || '取消' }}
      </button>
      <button
        :class="['glass-button', state.confirmDialog.value.tone === 'danger' ? 'button-danger' : 'button-primary']"
        type="button"
        @click="state.settleConfirm(true)"
      >
        {{ state.confirmDialog.value.confirmText || '确认' }}
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { TriangleAlert } from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'

defineProps({
  state: {
    type: Object,
    required: true
  }
})
</script>

<style scoped lang="scss">
.confirm-body {
  display: grid;
  gap: 16px;
}

.confirm-icon {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 18px;
}

.confirm-body p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.65;
}

.tone-danger {
  background: rgba(255, 104, 104, 0.16);
  color: var(--danger);
}

.tone-warning {
  background: rgba(255, 182, 72, 0.16);
  color: var(--warning);
}
</style>
