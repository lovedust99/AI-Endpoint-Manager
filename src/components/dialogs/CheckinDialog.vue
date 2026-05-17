<template>
  <AppModal
    :model-value="state.checkinDialogVisible.value"
    :title="state.checkinDialogType.value === 'add' ? '添加签到站点' : '编辑签到站点'"
    eyebrow="Automation Editor"
    description="支持 New-API 预置流程与手动 HTTP 请求配置。"
    size="lg"
    @close="state.closeCheckinDialog()"
  >
    <form class="dialog-form" @submit.prevent="state.submitCheckinForm()">
      <label class="field-block">
        <span>站点名称</span>
        <input v-model="state.checkinForm.value.name" class="glass-input" placeholder="例如：示例中转站" required />
      </label>

      <div class="field-block">
        <span>分类</span>
        <div class="token-field">
          <div class="token-list">
            <button
              v-for="category in state.checkinForm.value.categories"
              :key="category"
              class="token token-active"
              type="button"
              @click="state.removeFormCategoryTag('checkin', category)"
            >
              <span>{{ category }}</span>
              <X :size="14" />
            </button>
          </div>
          <AppCombobox
            v-model="state.checkinFormCategoryInput.value"
            :options="state.checkinCategoryOptions.value"
            :selected-values="state.checkinForm.value.categories"
            placeholder="搜索并选择一个或多个分类"
            modal
            multiple
            @select="state.toggleFormCategory('checkin', $event)"
          />
        </div>
      </div>

      <div class="field-block">
        <span>平台类型</span>
        <div class="segmented">
          <button
            :class="['segment', { active: state.checkinForm.value.platform === 'new-api' }]"
            type="button"
            @click="state.checkinForm.value.platform = 'new-api'"
          >
            New-API 预置
          </button>
          <button
            :class="['segment', { active: state.checkinForm.value.platform === 'custom' }]"
            type="button"
            @click="state.checkinForm.value.platform = 'custom'"
          >
            手动 HTTP
          </button>
        </div>
      </div>

      <template v-if="state.checkinForm.value.platform === 'new-api'">
        <div class="hint-panel">
          New-API 签到会请求 <code>/api/user/checkin</code>。新版 New-API 通常需要 Authorization 和 New-Api-User 两个认证字段。
        </div>

        <label class="field-block">
          <span>BaseURL</span>
          <input v-model="state.checkinForm.value.baseUrl" class="glass-input" placeholder="例如：https://new-api.example.com" required />
        </label>

        <label class="field-block">
          <span>API Key</span>
          <div class="input-with-action">
            <input
              v-model="state.checkinForm.value.apiKey"
              :type="state.showCheckinApiKey.value ? 'text' : 'password'"
              class="glass-input"
              placeholder="New-API 访问令牌"
              required
            />
            <button class="icon-action" type="button" @click="state.showCheckinApiKey.value = !state.showCheckinApiKey.value">
              <component :is="state.showCheckinApiKey.value ? EyeOff : Eye" :size="16" />
            </button>
          </div>
        </label>

        <label class="field-block">
          <span>用户 ID</span>
          <input v-model="state.checkinForm.value.userId" class="glass-input" placeholder="对应 New-Api-User 请求头，推荐填写" />
        </label>
      </template>

      <template v-else>
        <div class="field-block">
          <span>录入方式</span>
          <div class="segmented">
            <button
              :class="['segment', { active: state.checkinForm.value.request.inputMode === 'fields' }]"
              type="button"
              @click="state.checkinForm.value.request.inputMode = 'fields'"
            >
              手动填写
            </button>
            <button
              :class="['segment', { active: state.checkinForm.value.request.inputMode === 'command' }]"
              type="button"
              @click="state.checkinForm.value.request.inputMode = 'command'"
            >
              命令导入
            </button>
          </div>
        </div>

        <template v-if="state.checkinForm.value.request.inputMode === 'command'">
          <div class="hint-panel">
            支持粘贴 bash 或 Windows cmd 风格的完整 curl 命令。点击“解析请求”后会自动回填到下方字段。
          </div>
          <label class="field-block">
            <span>完整请求</span>
            <textarea
              v-model="state.checkinForm.value.request.commandText"
              class="glass-input glass-textarea"
              rows="7"
              placeholder="例如：curl 'https://example.com/api/checkin' -X POST -H 'token: xxx'"
            />
          </label>
          <div class="inline-actions">
            <button class="glass-button button-secondary" type="button" @click="state.parseRequestCommandAction()">
              解析请求
            </button>
          </div>
        </template>

        <label class="field-block">
          <span>请求地址</span>
          <input v-model="state.checkinForm.value.request.url" class="glass-input" placeholder="完整 URL，例如：https://example.com/api/checkin" required />
        </label>

        <div class="field-grid">
          <label class="field-block">
            <span>请求类型</span>
            <AppSelect
              :model-value="state.checkinForm.value.request.method"
              :options="methodOptions"
              modal
              placeholder="选择请求类型"
              @update:model-value="state.checkinForm.value.request.method = $event"
            />
          </label>

          <label class="field-block">
            <span>启用状态</span>
            <label class="switch-pill" :class="{ active: state.checkinForm.value.enabled }">
              <input v-model="state.checkinForm.value.enabled" type="checkbox" />
              <span class="switch-track" />
              <span class="switch-label">{{ state.checkinForm.value.enabled ? '已启用' : '已停用' }}</span>
            </label>
          </label>
        </div>

        <label class="field-block">
          <span>请求头</span>
          <textarea
            v-model="state.checkinForm.value.request.headersText"
            class="glass-input glass-textarea"
            rows="5"
            placeholder='支持 JSON，例如 {"token":"xxx"}；也支持每行 Key: Value。会自动忽略浏览器托管头。'
          />
        </label>

        <label class="field-block">
          <span>请求体</span>
          <textarea
            v-model="state.checkinForm.value.request.bodyText"
            class="glass-input glass-textarea"
            rows="5"
            placeholder="POST/PUT/PATCH 可填写 JSON 或原始文本；GET 可留空"
          />
        </label>

        <div class="field-grid">
          <label class="field-block">
            <span>成功关键词</span>
            <input v-model="state.checkinForm.value.request.successKeywords" class="glass-input" placeholder="多个用逗号分隔；命中任一关键词视为成功" />
          </label>
          <label class="field-block">
            <span>失败关键词</span>
            <input v-model="state.checkinForm.value.request.failureKeywords" class="glass-input" placeholder="多个用逗号分隔；命中任一关键词视为失败" />
          </label>
        </div>
      </template>

      <label v-if="state.checkinForm.value.platform === 'new-api'" class="field-block">
        <span>启用状态</span>
        <label class="switch-pill" :class="{ active: state.checkinForm.value.enabled }">
          <input v-model="state.checkinForm.value.enabled" type="checkbox" />
          <span class="switch-track" />
          <span class="switch-label">{{ state.checkinForm.value.enabled ? '已启用' : '已停用' }}</span>
        </label>
      </label>

      <label class="field-block">
        <span>备注</span>
        <textarea v-model="state.checkinForm.value.remark" class="glass-input glass-textarea" rows="4" placeholder="选填备注" />
      </label>
    </form>

    <template #footer>
      <div class="dialog-actions">
        <button class="glass-button button-secondary" type="button" @click="state.closeCheckinDialog()">取消</button>
        <button class="glass-button button-primary" type="button" @click="state.submitCheckinForm()">保存站点</button>
      </div>
    </template>
  </AppModal>
</template>

<script setup>
import { Eye, EyeOff, X } from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'
import AppCombobox from '../ui/AppCombobox.vue'
import AppSelect from '../ui/AppSelect.vue'

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
})

const methodOptions = props.state.httpMethods.map((method) => ({ label: method, value: method }))
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

.token-list,
.inline-actions {
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

.segmented {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.segment {
  min-height: 46px;
  padding: 0 16px;
  border: 1px solid var(--glass-stroke);
  border-radius: 16px;
  background: var(--glass-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    color var(--motion-fast);
}

.segment:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
}

.segment:focus-visible {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 4px rgba(92, 126, 255, 0.12);
}

.segment.active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
}

.hint-panel {
  padding: 14px 16px;
  border: 1px solid rgba(115, 145, 255, 0.22);
  border-radius: 18px;
  background: rgba(115, 145, 255, 0.08);
  color: var(--text-secondary);
  line-height: 1.55;
}

.hint-panel code {
  font-family: var(--font-mono);
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
