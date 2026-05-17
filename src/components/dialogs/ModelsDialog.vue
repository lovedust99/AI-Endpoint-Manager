<template>
  <AppModal
    :model-value="state.modelsDialogVisible.value"
    title="可用大模型列表"
    eyebrow="Model Catalog"
    description="从当前端点拉取的模型清单，可直接复制模型名或发起快速连通性测试。"
    size="lg"
    @close="state.closeModelsDialog()"
  >
    <div v-if="state.loadingModels.value" class="loading-panel">
      <LoaderCircle :size="20" class="spin" />
      <span>模型列表加载中...</span>
    </div>

    <div v-else-if="state.modelsList.value.length" class="model-grid">
      <article v-for="model in state.modelsList.value" :key="model.id" class="model-row">
        <div>
          <strong>{{ model.id }}</strong>
        </div>
        <div class="row-actions">
          <button class="glass-button button-secondary button-compact" type="button" @click="state.copyText(model.id, '模型名称')">
            <Copy :size="15" />
            <span>复制</span>
          </button>
          <button class="glass-button button-primary button-compact" type="button" :disabled="state.testingModelIds.value.has(model.id)" @click="state.testModel(model.id)">
            <Play :size="15" />
            <span>{{ state.testingModelIds.value.has(model.id) ? '测试中...' : '测试' }}</span>
          </button>
        </div>
      </article>
    </div>

    <div v-else class="empty-panel">
      <Boxes :size="26" />
      <div>
        <h3>没有拉取到模型</h3>
        <p>检查端点地址、密钥或网络可达性后重试。</p>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { Boxes, Copy, LoaderCircle, Play } from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'

defineProps({
  state: {
    type: Object,
    required: true
  }
})
</script>

<style scoped lang="scss">
.loading-panel,
.empty-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--glass-stroke);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
}

.loading-panel span,
.empty-panel p {
  color: var(--text-secondary);
}

.empty-panel h3 {
  margin: 0 0 6px;
  color: var(--text-primary);
}

.model-grid {
  display: grid;
  gap: 12px;
}

.model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--glass-stroke);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
}

.model-row strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
  word-break: break-all;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .model-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
