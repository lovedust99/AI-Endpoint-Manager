<template>
  <section class="view-stack">
    <section class="glass-panel panel-pad intro-panel">
      <div>
        <span class="section-kicker">Local Control</span>
        <h2>数据与运行参数</h2>
        <p>所有数据仅保存在浏览器本地或扩展存储中。导入导出不会触达外部服务。</p>
      </div>
    </section>

    <section class="glass-panel panel-pad settings-panel">
      <div class="panel-copy">
        <span class="section-kicker">Concurrency</span>
        <h3>签到并发数</h3>
        <p>一键签到和失败重试都使用这项设置。默认值为 2，建议控制在 1 到 4 之间。</p>
      </div>

      <div class="stepper-box">
        <button class="stepper-button" type="button" @click="state.decrementConcurrency()">-</button>
        <input
          :value="state.checkinConcurrency.value"
          class="stepper-input"
          min="1"
          max="10"
          type="number"
          @change="updateConcurrency($event.target.value)"
        />
        <button class="stepper-button" type="button" @click="state.incrementConcurrency()">+</button>
      </div>
    </section>

    <div class="actions-grid">
      <button class="action-card" type="button" @click="state.exportData()">
        <div class="action-icon">
          <Download :size="20" />
        </div>
        <strong>导出数据</strong>
        <p>保存端点、签到任务、分类和界面设置的 JSON 备份。</p>
      </button>

      <button class="action-card" type="button" @click="openPicker()">
        <div class="action-icon">
          <Upload :size="20" />
        </div>
        <strong>导入恢复</strong>
        <p>从 JSON 文件恢复端点与签到任务。会覆盖当前同类数据。</p>
      </button>

      <button class="action-card danger" type="button" @click="state.clearData()">
        <div class="action-icon">
          <Trash2 :size="20" />
        </div>
        <strong>清空缓存</strong>
        <p>删除本地端点、签到任务、分类、草稿和界面设置。</p>
      </button>
    </div>

    <input
      ref="fileInput"
      accept=".json"
      class="hidden-input"
      type="file"
      @change="handleFileChange"
    />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Download, Trash2, Upload } from 'lucide-vue-next'

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
})

const fileInput = ref(null)

const openPicker = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  if (file) props.state.importData(file)
  event.target.value = ''
}

const updateConcurrency = async (value) => {
  props.state.checkinConcurrency.value = Number(value)
  await props.state.saveAppSettings()
}
</script>

<style scoped lang="scss">
.view-stack {
  display: grid;
  gap: 20px;
}

.intro-panel h2,
.settings-panel h3 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--text-primary);
}

.intro-panel p,
.settings-panel p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.section-kicker {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.settings-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
}

.stepper-box {
  display: inline-grid;
  grid-template-columns: 48px 92px 48px;
  align-items: stretch;
  border: 1px solid var(--glass-border-strong);
  border-radius: 22px;
  overflow: hidden;
  background: var(--glass-surface-strong);
}

.stepper-button,
.stepper-input {
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 20px;
  text-align: center;
}

.stepper-button {
  cursor: pointer;
}

.stepper-input {
  min-height: 54px;
  font-weight: 700;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.action-card {
  display: grid;
  gap: 12px;
  padding: 22px;
  text-align: left;
  border: 1px solid var(--glass-border-strong);
  border-radius: 28px;
  background: var(--glass-surface-strong);
  color: inherit;
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    box-shadow var(--motion-fast);
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-border);
  box-shadow: var(--shadow-float);
}

.action-card strong {
  color: var(--text-primary);
  font-size: 18px;
}

.action-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.action-icon {
  display: inline-grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(92, 126, 255, 0.22), rgba(79, 230, 196, 0.18));
  color: var(--text-primary);
}

.action-card.danger .action-icon {
  background: linear-gradient(135deg, rgba(255, 113, 113, 0.22), rgba(255, 170, 117, 0.18));
}

.hidden-input {
  display: none;
}

@media (max-width: 980px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .settings-panel {
    grid-template-columns: 1fr;
  }
}
</style>
