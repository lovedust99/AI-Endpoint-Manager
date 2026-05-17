<template>
  <AppModal
    :model-value="state.exportDialogVisible.value"
    title="导出青龙一键签到脚本"
    eyebrow="Qinglong Export"
    description="导出的脚本会包含所选站点的认证信息，请只放在可信环境中。"
    size="lg"
    @close="state.closeExportDialog()"
  >
    <div class="dialog-stack">
      <div class="hint-panel warning">
        导出的脚本会携带所选站点的认证信息。请仅在可信的青龙实例中保存和执行。
      </div>

      <div class="form-row">
        <label class="field-block">
          <span>时间预设</span>
          <AppSelect
            :model-value="state.schedulePreset.value"
            :options="state.schedulePresetOptions"
            modal
            placeholder="选择时间预设"
            @update:model-value="updatePreset"
          />
        </label>

        <label class="field-block">
          <span>Cron 表达式</span>
          <input v-model="state.exportCron.value" class="glass-input" placeholder="例如：10 8 * * *" />
        </label>
      </div>

      <div class="section-head">
        <div>
          <span class="section-kicker">Cron Preview</span>
          <h3>青龙命令</h3>
        </div>
        <button class="glass-button button-secondary" type="button" @click="state.copyText(state.exportMetaText.value, 'Cron 与青龙命令')">
          <Copy :size="16" />
          <span>复制 Cron</span>
        </button>
      </div>
      <pre class="code-box">{{ state.exportMetaText.value }}</pre>

      <div class="section-head">
        <div>
          <span class="section-kicker">Generated Script</span>
          <h3>脚本代码</h3>
        </div>
        <button class="glass-button button-secondary" type="button" @click="state.copyText(state.generatedQinglongScriptText.value, '青龙脚本代码')">
          <Copy :size="16" />
          <span>复制脚本</span>
        </button>
      </div>
      <pre class="code-box tall">{{ state.generatedQinglongScriptText.value }}</pre>
    </div>

    <template #footer>
      <button class="glass-button button-secondary" type="button" @click="state.closeExportDialog()">关闭</button>
    </template>
  </AppModal>
</template>

<script setup>
import { Copy } from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'
import AppSelect from '../ui/AppSelect.vue'

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
})

const updatePreset = (value) => {
  props.state.schedulePreset.value = value
  props.state.applySchedulePreset()
}
</script>

<style scoped lang="scss">
.dialog-stack,
.field-block {
  display: grid;
  gap: 16px;
}

.field-block span,
.section-kicker {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.form-row {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
}

.hint-panel {
  padding: 14px 16px;
  border-radius: 18px;
  line-height: 1.55;
}

.warning {
  border: 1px solid rgba(255, 186, 82, 0.22);
  background: rgba(255, 186, 82, 0.09);
  color: var(--text-secondary);
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.section-head h3 {
  margin: 6px 0 0;
  color: var(--text-primary);
}

.code-box {
  margin: 0;
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
  max-height: 240px;
  overflow: auto;
}

.code-box.tall {
  max-height: 440px;
}

@media (max-width: 760px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
