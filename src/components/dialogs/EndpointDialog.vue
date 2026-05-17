<template>
  <AppModal
    :model-value="state.endpointDialogVisible.value"
    :title="state.endpointDialogType.value === 'add' ? '添加端点' : '编辑端点'"
    eyebrow="Endpoint Editor"
    size="md"
    @close="state.closeEndpointDialog()"
  >
    <form class="dialog-form" @submit.prevent="state.submitEndpointForm()">
      <label class="field-block">
        <span>名称</span>
        <input v-model="state.endpointForm.value.name" class="glass-input" placeholder="例如 OpenAI 官方" />
      </label>

      <div class="field-block">
        <span>分类</span>
        <div class="token-field">
          <div class="token-list">
            <button
              v-for="category in state.endpointForm.value.categories"
              :key="category"
              class="token token-active"
              type="button"
              @click="state.removeFormCategoryTag('endpoint', category)"
            >
              <span>{{ category }}</span>
              <X :size="14" />
            </button>
          </div>
          <AppCombobox
            v-model="state.endpointFormCategoryInput.value"
            :options="state.endpointCategoryOptions.value"
            :selected-values="state.endpointForm.value.categories"
            placeholder="搜索并选择一个或多个分类"
            modal
            multiple
            @select="state.toggleFormCategory('endpoint', $event)"
          />
        </div>
      </div>

      <label class="field-block">
        <span>BaseURL</span>
        <input v-model="state.endpointForm.value.baseUrl" class="glass-input" placeholder="例如：https://api.openai.com" required />
      </label>

      <label class="field-block">
        <span>API Key</span>
        <div class="input-with-action">
          <input
            v-model="state.endpointForm.value.apiKey"
            :type="state.showEndpointApiKey.value ? 'text' : 'password'"
            class="glass-input"
            placeholder="选填"
          />
          <button class="icon-action" type="button" @click="state.showEndpointApiKey.value = !state.showEndpointApiKey.value">
            <component :is="state.showEndpointApiKey.value ? EyeOff : Eye" :size="16" />
          </button>
        </div>
      </label>

      <label class="field-block">
        <span>相关站点</span>
        <input v-model="state.endpointForm.value.site" class="glass-input" placeholder="选填，例如：https://platform.openai.com" />
      </label>

      <div class="field-grid">
        <label class="field-block">
          <span>权重（范围：0 及以上）</span>
          <input v-model.number="state.endpointForm.value.weight" class="glass-input" min="0" type="number" />
        </label>

        <label class="field-block">
          <span>启用状态</span>
          <label class="switch-pill" :class="{ active: state.endpointForm.value.enabled }">
            <input v-model="state.endpointForm.value.enabled" type="checkbox" />
            <span class="switch-track" />
            <span class="switch-label">{{ state.endpointForm.value.enabled ? '已启用' : '已禁用' }}</span>
          </label>
        </label>
      </div>

      <label class="field-block">
        <span>备注</span>
        <textarea v-model="state.endpointForm.value.remark" class="glass-input glass-textarea" placeholder="选填备注" rows="4" />
      </label>
    </form>

    <template #footer>
      <div class="dialog-actions">
        <button class="glass-button button-secondary" type="button" @click="state.closeEndpointDialog()">取消</button>
        <button class="glass-button button-primary" type="button" @click="state.submitEndpointForm()">保存端点</button>
      </div>
    </template>
  </AppModal>
</template>

<script setup>
import { Eye, EyeOff, X } from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'
import AppCombobox from '../ui/AppCombobox.vue'

defineProps({
  state: {
    type: Object,
    required: true
  }
})
</script>

<style scoped lang="scss">
.dialog-form,
.field-block,
.token-field,
.dialog-actions {
  display: grid;
  gap: 12px;
}

.dialog-form {
  gap: 18px;
}

.dialog-actions {
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-actions .glass-button {
  width: 100%;
}

.field-block span {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.token-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.token {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--glass-stroke);
  border-radius: 999px;
  background: var(--glass-elevated);
  color: var(--text-secondary);
  cursor: pointer;
}

.token-active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--text-primary);
}

.input-with-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.icon-action {
  width: 46px;
  min-width: 46px;
  padding: 0;
  display: grid;
  place-items: center;
  align-self: stretch;
  border: 1px solid var(--glass-stroke);
  border-radius: 16px;
  background: var(--glass-elevated);
  color: var(--text-primary);
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    color var(--motion-fast);
}

.icon-action:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border);
  background: var(--accent-soft);
  box-shadow: var(--shadow-soft);
}

.icon-action:focus-visible {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 4px rgba(92, 126, 255, 0.12);
}

.icon-action :deep(svg) {
  display: block;
}

.switch-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 14px;
  border: 1px solid var(--glass-stroke);
  border-radius: 18px;
  background: var(--glass-elevated);
}

.switch-pill input {
  display: none;
}

.switch-track {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: rgba(140, 149, 170, 0.3);
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--motion-fast);
}

.switch-pill.active .switch-track {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
}

.switch-pill.active .switch-track::after {
  transform: translateX(20px);
}

.switch-label {
  color: var(--text-primary);
  font-weight: 600;
}

@media (max-width: 760px) {
  .field-grid,
  .input-with-action {
    grid-template-columns: 1fr;
  }

  .dialog-actions {
    gap: 10px;
  }
}
</style>
