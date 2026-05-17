<template>
  <AppModal
    :model-value="state.remarkDialogVisible.value"
    title="备注详情"
    eyebrow="Annotation"
    size="sm"
    @close="state.closeRemarkDialog()"
  >
    <p class="remark-copy">{{ state.currentRemark.value }}</p>

    <template #footer>
      <button class="glass-button button-secondary" type="button" @click="state.closeRemarkDialog()">关闭</button>
    </template>
  </AppModal>
</template>

<script setup>
import AppModal from '../ui/AppModal.vue'

defineProps({
  state: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.remark-copy {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
