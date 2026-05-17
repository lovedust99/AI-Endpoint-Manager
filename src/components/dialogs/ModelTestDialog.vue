<template>
  <AppModal
    :model-value="state.modelTestDialogVisible.value"
    title="模型测试结果"
    eyebrow="Response Probe"
    description="展示连通性测试的响应摘要与完整返回体。"
    size="lg"
    @close="state.closeModelTestDialog()"
  >
    <div v-if="state.modelTestResult.value" class="dialog-stack">
      <div class="summary-panel">
        <div>
          <h3>{{ state.modelTestResult.value.modelId }}</h3>
          <p>{{ state.modelTestResult.value.endpointName || '未命名端点' }} · {{ state.modelTestResult.value.baseUrl }}</p>
        </div>
        <span :class="['status-chip', state.modelTestResult.value.ok ? 'tone-success' : 'tone-danger']">
          {{ state.modelTestResult.value.ok ? '测试通过' : '测试失败' }}
        </span>
      </div>

      <div class="meta-row">
        <span>HTTP {{ state.modelTestResult.value.status || '-' }}</span>
        <span>{{ state.modelTestResult.value.elapsedMs }}ms</span>
        <span v-if="state.modelTestResult.value.error">{{ state.modelTestResult.value.error }}</span>
      </div>

      <div class="section-head">
        <div>
          <span class="section-kicker">Payload</span>
          <h3>完整回复</h3>
        </div>
        <button class="glass-button button-secondary" type="button" @click="state.copyText(state.formatOutput(state.modelTestResult.value.response), '模型测试回复')">
          <Copy :size="16" />
          <span>复制回复</span>
        </button>
      </div>
      <pre class="code-box">{{ state.formatOutput(state.modelTestResult.value.response) }}</pre>
    </div>
  </AppModal>
</template>

<script setup>
import { Copy } from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'

defineProps({
  state: {
    type: Object,
    required: true
  }
})
</script>

<style scoped lang="scss">
.dialog-stack {
  display: grid;
  gap: 16px;
}

.summary-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.summary-panel h3 {
  margin: 0;
  color: var(--text-primary);
}

.summary-panel p,
.meta-row {
  color: var(--text-secondary);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-row span,
.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--glass-elevated);
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.section-kicker {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.section-head h3 {
  margin: 6px 0 0;
  color: var(--text-primary);
}

.code-box {
  margin: 0;
  max-height: 460px;
  overflow: auto;
  padding: 16px 18px;
  border: 1px solid var(--glass-stroke);
  border-radius: 22px;
  background: rgba(7, 12, 24, 0.34);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.tone-success {
  background: rgba(83, 204, 131, 0.14);
  color: var(--success);
}

.tone-danger {
  background: rgba(255, 104, 104, 0.14);
  color: var(--danger);
}

@media (max-width: 760px) {
  .summary-panel,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
