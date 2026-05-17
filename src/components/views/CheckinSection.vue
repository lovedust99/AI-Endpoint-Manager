<template>
  <section class="view-stack">
    <section class="glass-panel panel-pad overview-panel">
      <div class="overview-copy">
        <span class="section-kicker">{{ state.headerMeta.value.eyebrow }}</span>
        <h2>{{ state.headerMeta.value.title }}</h2>
        <p>{{ state.headerMeta.value.description }}</p>
      </div>

      <div class="overview-side">
        <div class="overview-metrics">
          <article class="feature-tile">
            <span>签到站点</span>
            <strong>{{ state.checkinSites.value.length }}</strong>
            <small>已录入的全部自动化目标</small>
          </article>
          <article class="feature-tile">
            <span>失败站点</span>
            <strong>{{ state.failedCheckinCount.value }}</strong>
            <small>最近一次执行失败的目标</small>
          </article>
        </div>
      </div>
    </section>

    <section class="glass-panel panel-pad filter-panel">
      <template v-if="isPopupView">
        <div>
          <span class="section-kicker">Operation Area</span>
          <h3>操作区</h3>
        </div>

        <div class="popup-operation-grid">
          <button class="glass-button button-primary action-trigger" type="button" @click="state.openCheckinDialog('add')">
            <Plus :size="16" />
            <span>添加签到站点</span>
          </button>

          <button class="glass-button button-secondary category-manage-trigger" type="button" @click="state.openCheckinCategoryManager()">
            <Settings2 :size="16" />
            <span>分类管理</span>
          </button>

          <div class="popup-command-actions">
            <button class="glass-button button-primary" type="button" :disabled="state.batchChecking.value" @click="state.runAllCheckins()">
              <Play :size="16" />
              <span>{{ state.batchChecking.value ? '执行中...' : '签到' }}</span>
            </button>
            <button class="glass-button button-secondary" type="button" :disabled="!state.hasFailedCheckins.value || state.batchChecking.value" @click="state.retryFailedCheckins()">
              <RefreshCcw :size="16" />
              <span>重试</span>
            </button>
            <button class="glass-button button-secondary" type="button" :disabled="state.selectedCheckinSites.value.length === 0" @click="state.openExportDialog()">
              <Download :size="16" />
              <span>导出脚本</span>
            </button>
          </div>

          <div class="popup-filter-selects">
            <label class="field-shell field-fixed">
              <AppSelect
                :model-value="checkinCategoryFilter"
                :options="checkinCategoryOptions"
                placeholder="选择分类"
                @update:model-value="setCategoryFilter"
              />
            </label>

            <label class="field-shell field-fixed">
              <AppSelect
                :model-value="checkinEnabledFilter"
                :options="checkinStatusOptions"
                placeholder="选择状态"
                @update:model-value="setEnabledFilter"
              />
            </label>
          </div>

          <label class="selection-chip popup-selection-chip">
            <input :checked="state.allFilteredCheckinsSelected.value" type="checkbox" @change="state.toggleAllFilteredCheckins($event.target.checked)" />
            <span>全选当前筛选结果</span>
          </label>
        </div>
      </template>

      <template v-else>
        <div class="filter-head">
          <div>
            <span class="section-kicker">Operation Area</span>
            <h3>操作区</h3>
          </div>

          <div class="filter-tools">
            <div class="filter-grid">
              <button class="glass-button button-primary action-trigger" type="button" @click="state.openCheckinDialog('add')">
                <Plus :size="16" />
                <span>添加签到站点</span>
              </button>

              <button class="glass-button button-secondary category-manage-trigger" type="button" @click="state.openCheckinCategoryManager()">
                <Settings2 :size="16" />
                <span>分类管理</span>
              </button>

              <label class="field-shell field-fixed">
                <AppSelect
                  :model-value="checkinCategoryFilter"
                  :options="checkinCategoryOptions"
                  placeholder="选择分类"
                  @update:model-value="setCategoryFilter"
                />
              </label>

              <label class="field-shell field-fixed">
                <AppSelect
                  :model-value="checkinEnabledFilter"
                  :options="checkinStatusOptions"
                  placeholder="选择状态"
                  @update:model-value="setEnabledFilter"
                />
              </label>
            </div>

          </div>
        </div>

        <div class="filter-foot">
          <div class="command-actions">
            <button class="glass-button button-primary" type="button" :disabled="state.batchChecking.value" @click="state.runAllCheckins()">
              <Play :size="16" />
              <span>{{ state.batchChecking.value ? '执行中...' : '一键签到' }}</span>
            </button>
            <button class="glass-button button-secondary" type="button" :disabled="!state.hasFailedCheckins.value || state.batchChecking.value" @click="state.retryFailedCheckins()">
              <RefreshCcw :size="16" />
              <span>失败重试</span>
            </button>
            <button class="glass-button button-secondary" type="button" :disabled="state.selectedCheckinSites.value.length === 0" @click="state.openExportDialog()">
              <Download :size="16" />
              <span>导出青龙脚本</span>
            </button>
          </div>

          <label class="selection-chip">
            <input :checked="state.allFilteredCheckinsSelected.value" type="checkbox" @change="state.toggleAllFilteredCheckins($event.target.checked)" />
            <span>全选当前筛选结果</span>
          </label>
        </div>
      </template>
    </section>

    <section
      v-if="batchProgressVisible"
      :class="[
        'glass-panel',
        'panel-pad',
        'progress-panel',
        `state-${batchProgressState}`,
        { finished: batchProgress.finished }
      ]"
    >
      <div class="progress-head">
        <div class="progress-copy">
          <span class="section-kicker">Live Progress</span>
          <h3>{{ batchProgress.label || '签到进度' }}</h3>
          <p>{{ batchProgressDescription }}</p>
        </div>

        <div class="progress-overview">
          <span :class="['status-chip', batchProgressState === 'success' ? 'tone-success' : batchProgressState === 'failed' ? 'tone-danger' : 'tone-warning']">
            {{ batchProgress.finished ? '已完成' : '执行中' }}
          </span>
          <strong>{{ batchProgress.completed }}/{{ batchProgress.total }}</strong>
        </div>
      </div>

      <div class="progress-track">
        <span class="progress-fill" :style="{ width: `${batchProgress.percent}%` }" />
      </div>

      <div class="progress-grid">
        <article class="progress-stat">
          <span>成功</span>
          <strong>{{ batchProgress.success }}</strong>
        </article>
        <article class="progress-stat">
          <span>失败</span>
          <strong>{{ batchProgress.failed }}</strong>
        </article>
        <article class="progress-stat">
          <span>完成率</span>
          <strong>{{ batchProgress.percent }}%</strong>
        </article>
        <article class="progress-stat">
          <span>当前站点</span>
          <strong>{{ batchProgress.currentSiteName || '等待开始' }}</strong>
        </article>
      </div>
    </section>

    <div class="list-toolbar">
      <div class="list-toolbar-copy">
        <span class="section-kicker">Display</span>
        <strong>当前共 {{ state.filteredCheckinSites.value.length }} 项</strong>
      </div>

      <div class="list-toolbar-actions">
        <label class="switch-pill" :class="{ active: showFullOutput }">
          <input :checked="showFullOutput" type="checkbox" @change="setFullOutput($event.target.checked)" />
          <span class="switch-track" />
          <span class="switch-label">{{ showFullOutput ? '完整输出' : '摘要模式' }}</span>
        </label>

        <button
          v-if="isPopupView"
          class="glass-button button-secondary compact-view-trigger"
          type="button"
          @click="state.openStandaloneMode()"
        >
          <Monitor :size="16" />
          <span>切换为大屏显示</span>
        </button>
        <div v-else class="layout-switch" aria-label="切换签到列表布局">
          <button
            :class="['layout-button', { active: currentCheckinLayoutMode === state.CHECKIN_LAYOUT_LIST }]"
            type="button"
            :aria-pressed="currentCheckinLayoutMode === state.CHECKIN_LAYOUT_LIST"
            @click="setCheckinLayoutMode(state.CHECKIN_LAYOUT_LIST)"
          >
            <Rows3 :size="16" />
            <span>列表</span>
          </button>
          <button
            :class="['layout-button', { active: currentCheckinLayoutMode === state.CHECKIN_LAYOUT_CARD }]"
            type="button"
            :aria-pressed="currentCheckinLayoutMode === state.CHECKIN_LAYOUT_CARD"
            @click="setCheckinLayoutMode(state.CHECKIN_LAYOUT_CARD)"
          >
            <LayoutGrid :size="16" />
            <span>卡片</span>
          </button>
        </div>
      </div>
    </div>

    <div :class="['checkin-board', `layout-${currentCheckinLayoutMode}`]">
      <article
        v-for="row in state.filteredCheckinSites.value"
        :key="row.id"
        :class="[
          'glass-card',
          'checkin-card',
          `layout-${currentCheckinLayoutMode}`,
          { 'completed-flash': completedCheckinIds.has(row.id) }
        ]"
      >
        <template v-if="currentCheckinLayoutMode === state.CHECKIN_LAYOUT_CARD">
          <div class="card-top">
            <label class="select-badge">
              <input
                :checked="state.selectedCheckinSiteIds.value.includes(row.id)"
                type="checkbox"
                @change="state.toggleCheckinSelection(row.id, $event.target.checked)"
              />
              <span />
            </label>

            <div class="card-copy">
              <div class="card-heading">
                <h3 class="card-title">{{ row.name || '未命名站点' }}</h3>
                <div class="status-line">
                  <span :class="['status-chip', row.platform === 'new-api' ? 'tone-success' : 'tone-neutral']">
                    {{ row.platform === 'new-api' ? 'New-API' : 'HTTP' }}
                  </span>
                  <span :class="['status-chip', row.enabled === false ? 'tone-danger' : 'tone-success']">
                    {{ row.enabled === false ? '禁用' : '启用' }}
                  </span>
                  <span :class="['status-chip', `tone-${state.statusTone(row.lastStatus)}`]">
                    {{ state.statusLabel(row.lastStatus) }}
                  </span>
                </div>
              </div>
              <p class="card-url">{{ row.platform === 'new-api' ? state.processBaseUrl(row.baseUrl) : row.request.url }}</p>
              <div class="tag-cloud card-category-cloud">
                <span v-for="category in state.displayCategories(row)" :key="category" class="tag-chip muted">
                  {{ category }}
                </span>
              </div>
            </div>
          </div>

          <div class="result-panel">
            <div class="result-line">
              <ListChecks :size="15" />
              <strong>{{ row.lastSummary || '尚未执行' }}</strong>
            </div>
            <div v-if="row.lastRunAt" class="meta-line">
              <Clock3 :size="14" />
              <span>{{ state.formatTime(row.lastRunAt) }}</span>
            </div>
            <div
              v-if="checkinProgressMap[row.id]"
              :class="[
                'task-progress',
                {
                  running: checkinProgressMap[row.id].running,
                  finished: !checkinProgressMap[row.id].running,
                  success: checkinProgressMap[row.id].ok === true,
                  failed: checkinProgressMap[row.id].ok === false
                }
              ]"
            >
              <div class="task-progress-head">
                <span>{{ describeSiteProgress(checkinProgressMap[row.id]) }}</span>
                <strong>{{ checkinProgressMap[row.id].percent }}%</strong>
              </div>
              <div class="progress-track compact">
                <span class="progress-fill" :style="{ width: `${checkinProgressMap[row.id].percent}%` }" />
              </div>
            </div>
            <pre v-if="showFullOutput && row.lastResponse" class="response-box">{{ state.formatOutput(row.lastResponse) }}</pre>
          </div>

          <footer :class="['card-actions', { 'popup-split-actions': isPopupView }]">
            <button class="glass-button button-primary" type="button" :disabled="row.enabled === false || state.checkingSiteIds.value.has(row.id) || state.batchChecking.value" @click="state.runSingleCheckin(row)">
              <Play :size="16" />
              <span>{{ state.checkingSiteIds.value.has(row.id) ? '执行中...' : '签到' }}</span>
            </button>
            <button class="glass-button button-secondary" type="button" :disabled="row.enabled === false || row.lastStatus !== 'failed' || state.batchChecking.value" @click="state.runSingleCheckin(row)">
              <RefreshCcw :size="16" />
              <span>重试</span>
            </button>
            <button class="glass-button button-secondary" type="button" @click="state.openCheckinDialog('edit', row)">
              <Pencil :size="16" />
              <span>编辑</span>
            </button>
            <button class="glass-button button-danger" type="button" @click="state.deleteCheckinSite(row)">
              <Trash2 :size="16" />
              <span>删除</span>
            </button>
          </footer>
        </template>

        <template v-else>
          <div class="checkin-main">
            <label class="select-badge">
              <input
                :checked="state.selectedCheckinSiteIds.value.includes(row.id)"
                type="checkbox"
                @change="state.toggleCheckinSelection(row.id, $event.target.checked)"
              />
              <span />
            </label>
          </div>

          <div class="info-stack">
            <div class="title-copy">
              <h3>{{ row.name || '未命名站点' }}</h3>
              <p>{{ row.platform === 'new-api' ? state.processBaseUrl(row.baseUrl) : row.request.url }}</p>
            </div>

            <div class="status-bundle">
              <span :class="['status-chip', row.platform === 'new-api' ? 'tone-success' : 'tone-neutral']">
                {{ row.platform === 'new-api' ? 'New-API' : 'HTTP' }}
              </span>
              <span :class="['status-chip', row.enabled === false ? 'tone-danger' : 'tone-success']">
                {{ row.enabled === false ? '禁用' : '启用' }}
              </span>
              <span :class="['status-chip', `tone-${state.statusTone(row.lastStatus)}`]">
                {{ state.statusLabel(row.lastStatus) }}
              </span>
            </div>

            <div class="tag-cloud">
              <span v-for="category in state.displayCategories(row)" :key="category" class="tag-chip muted">
                {{ category }}
              </span>
            </div>

          </div>

          <div class="result-shell">
            <div class="result-panel">
              <div class="result-stack">
              <div class="result-line">
                  <ListChecks :size="15" />
                  <strong>{{ row.lastSummary || '尚未执行' }}</strong>
                </div>
                <div v-if="row.lastRunAt" class="meta-line">
                  <Clock3 :size="14" />
                  <span>{{ state.formatTime(row.lastRunAt) }}</span>
                </div>
                <div
                  v-if="checkinProgressMap[row.id]"
                  :class="[
                    'task-progress',
                    {
                      running: checkinProgressMap[row.id].running,
                      finished: !checkinProgressMap[row.id].running,
                      success: checkinProgressMap[row.id].ok === true,
                      failed: checkinProgressMap[row.id].ok === false
                    }
                  ]"
                >
                  <div class="task-progress-head">
                    <span>{{ describeSiteProgress(checkinProgressMap[row.id]) }}</span>
                    <strong>{{ checkinProgressMap[row.id].percent }}%</strong>
                  </div>
                  <div class="progress-track compact">
                    <span class="progress-fill" :style="{ width: `${checkinProgressMap[row.id].percent}%` }" />
                  </div>
                </div>
                <pre v-if="showFullOutput && row.lastResponse" class="response-box">{{ state.formatOutput(row.lastResponse) }}</pre>
              </div>
            </div>

            <footer :class="['card-actions', 'list-actions', { 'popup-split-actions': isPopupView }]">
              <button class="glass-button button-primary" type="button" :disabled="row.enabled === false || state.checkingSiteIds.value.has(row.id) || state.batchChecking.value" @click="state.runSingleCheckin(row)">
                <Play :size="16" />
                <span>{{ state.checkingSiteIds.value.has(row.id) ? '执行中...' : '签到' }}</span>
              </button>
              <button class="glass-button button-secondary" type="button" :disabled="row.enabled === false || row.lastStatus !== 'failed' || state.batchChecking.value" @click="state.runSingleCheckin(row)">
                <RefreshCcw :size="16" />
                <span>重试</span>
              </button>
              <button class="glass-button button-secondary" type="button" @click="state.openCheckinDialog('edit', row)">
                <Pencil :size="16" />
                <span>编辑</span>
              </button>
              <button class="glass-button button-danger" type="button" @click="state.deleteCheckinSite(row)">
                <Trash2 :size="16" />
                <span>删除</span>
              </button>
            </footer>
          </div>
        </template>
      </article>
    </div>

    <section v-if="state.filteredCheckinSites.value.length === 0" class="glass-panel panel-pad empty-panel">
      <CloudMoon :size="28" />
      <div>
        <h3>当前筛选下没有签到任务</h3>
        <p>可以添加站点、切换筛选，或导入已有 JSON 配置恢复数据。</p>
      </div>
    </section>

    <AppModal
      :model-value="checkinCategoryManagerVisible"
      title="签到分类管理"
      eyebrow="Category Manager"
      description="在这里统一新增或删除签到分类，避免在操作区中误触创建无效分类。"
      size="md"
      @close="state.closeCheckinCategoryManager()"
    >
      <div class="category-manager">
        <div class="category-manager-input">
          <input
            :value="checkinCategoryInput"
            class="glass-input"
            placeholder="输入签到分类，例如：每日、备用、手动"
            @input="setCategoryInput($event.target.value)"
            @keydown.enter.prevent="state.addCategory('checkin')"
          />
          <button class="glass-button button-primary" type="button" @click="state.addCategory('checkin')">
            <Plus :size="16" />
            <span>添加分类</span>
          </button>
        </div>

        <div class="category-manager-tags">
          <button
            v-for="category in state.checkinCategoryOptions.value"
            :key="category"
            class="tag-chip removable"
            type="button"
            @click="state.removeCategory('checkin', category)"
          >
            <span>{{ category }}</span>
            <X :size="14" />
          </button>
          <span v-if="state.checkinCategoryOptions.value.length === 0" class="empty-copy">暂无分类</span>
        </div>
      </div>
    </AppModal>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import {
  CloudMoon,
  Clock3,
  Download,
  LayoutGrid,
  ListChecks,
  Monitor,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Rows3,
  Settings2,
  Trash2,
  X
} from 'lucide-vue-next'
import AppModal from '../ui/AppModal.vue'
import AppSelect from '../ui/AppSelect.vue'

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
})

const showFullOutput = computed(() => props.state.showFullOutput.value)
const isPopupView = computed(() => props.state.isPopup.value)
const currentCheckinLayoutMode = computed(() => (
  isPopupView.value ? props.state.CHECKIN_LAYOUT_CARD : props.state.checkinLayoutMode.value
))
const checkinCategoryManagerVisible = computed(() => props.state.checkinCategoryManagerVisible.value)
const checkinCategoryFilter = computed(() => props.state.checkinCategoryFilter.value)
const checkinEnabledFilter = computed(() => props.state.checkinEnabledFilter.value)
const checkinCategoryInput = computed(() => props.state.checkinCategoryInput.value)
const batchProgressVisible = computed(() => props.state.batchProgressVisible.value)
const batchProgress = computed(() => props.state.batchProgress.value)
const checkinProgressMap = computed(() => props.state.checkinProgressMap.value)
const completedCheckinIds = computed(() => props.state.completedCheckinIds.value)
const checkinCategoryOptions = computed(() => [
  { label: '全部分类', value: props.state.CATEGORY_ALL },
  { label: '未分类', value: props.state.CATEGORY_NONE },
  ...props.state.checkinCategoryOptions.value.map((category) => ({ label: category, value: category }))
])

const checkinStatusOptions = [
  { label: '仅启用', value: props.state.STATUS_FILTER_ENABLED },
  { label: '仅禁用', value: props.state.STATUS_FILTER_DISABLED },
  { label: '全部状态', value: props.state.STATUS_FILTER_ALL }
]

const batchProgressState = computed(() => {
  if (!batchProgress.value.finished) return 'running'
  return batchProgress.value.failed > 0 ? 'failed' : 'success'
})

const batchProgressDescription = computed(() => {
  if (!batchProgress.value.total) return '等待新的签到任务。'
  if (!batchProgress.value.finished) {
    return `正在处理 ${batchProgress.value.currentSiteName || '签到任务'}，已完成 ${batchProgress.value.completed}/${batchProgress.value.total}。`
  }

  if (batchProgress.value.failed > 0) {
    return `本轮共完成 ${batchProgress.value.total} 个站点，成功 ${batchProgress.value.success} 个，失败 ${batchProgress.value.failed} 个。`
  }

  return `本轮 ${batchProgress.value.total} 个站点已全部完成。`
})

const describeSiteProgress = (progress) => {
  if (!progress) return ''
  if (progress.running) return progress.label || '执行中'
  return progress.ok ? '本次签到已完成' : '本次请求已结束'
}

const setFullOutput = (value) => {
  props.state.showFullOutput.value = value
}

const setCheckinLayoutMode = (value) => {
  if (isPopupView.value) return
  props.state.checkinLayoutMode.value = value
}

const setCategoryFilter = (value) => {
  props.state.checkinCategoryFilter.value = value
}

const setEnabledFilter = (value) => {
  props.state.checkinEnabledFilter.value = value
}

const setCategoryInput = (value) => {
  props.state.checkinCategoryInput.value = value
}
</script>

<style scoped lang="scss">
.view-stack {
  display: grid;
  gap: 20px;
}

.feature-tile span,
.field-shell span,
.section-kicker {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.overview-panel,
.filter-panel {
  display: grid;
  gap: 18px;
}

.filter-panel {
  position: relative;
  z-index: 8;
  overflow: visible;
}

.overview-panel {
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.95fr);
  gap: 22px;
  align-items: stretch;
  position: relative;
  overflow: hidden;
}

.overview-panel > * {
  position: relative;
  z-index: 1;
}

.overview-panel::before,
.overview-panel::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.overview-panel::before {
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 0% 14%, rgba(102, 168, 255, 0.22), transparent 34%),
    radial-gradient(circle at 22% 52%, rgba(102, 168, 255, 0.12), transparent 30%),
    linear-gradient(90deg, rgba(102, 168, 255, 0.14) 0%, rgba(102, 168, 255, 0.09) 28%, rgba(102, 168, 255, 0.04) 48%, rgba(102, 168, 255, 0.015) 66%, rgba(102, 168, 255, 0) 80%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.overview-panel::after {
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.18), transparent 14%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 24%, rgba(255, 255, 255, 0.015) 42%, rgba(255, 255, 255, 0) 60%);
  opacity: 0.78;
}

.overview-copy {
  display: grid;
  align-content: start;
  align-items: start;
  min-height: 100%;
}

.overview-copy h2,
.filter-panel h3 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--text-primary);
}

.overview-copy p,
.filter-panel p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.overview-side {
  display: grid;
  gap: 16px;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.status-line {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.feature-tile {
  padding: 18px;
  border: 1px solid var(--glass-border-strong);
  border-radius: 22px;
  background: var(--glass-surface-strong);
  box-shadow: var(--shadow-float);
}

.feature-tile strong {
  display: block;
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 1;
  color: var(--text-primary);
}

.feature-tile small {
  display: block;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.filter-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
}

.filter-tools {
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 14px;
  flex-wrap: wrap;
}

.filter-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 14px;
  align-items: center;
}

.field-shell {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.field-fixed {
  width: 196px;
}

.category-manage-trigger {
  min-width: 122px;
  white-space: nowrap;
}

.action-trigger {
  min-width: 144px;
  white-space: nowrap;
}

.action-trigger:hover {
  box-shadow: 0 18px 34px rgba(92, 126, 255, 0.3);
  filter: saturate(1.06);
}

.popup-operation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.popup-command-actions,
.popup-filter-selects {
  display: grid;
  grid-column: 1 / -1;
  gap: 12px;
}

.popup-command-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.popup-filter-selects {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.popup-command-actions .glass-button,
.popup-filter-selects .field-fixed,
.popup-selection-chip {
  width: 100%;
}

.popup-command-actions .glass-button {
  min-width: 0;
  padding-inline: 12px;
  white-space: nowrap;
}

.popup-filter-selects .field-fixed {
  min-width: 0;
}

.popup-selection-chip {
  grid-column: 1 / -1;
  min-height: 46px;
}

.switch-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--glass-stroke);
  border-radius: 999px;
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
  transition: background var(--motion-fast);
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
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.16);
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

.filter-foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

.command-actions,
.status-bundle,
.tag-cloud,
.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tag-chip,
.status-chip,
.selection-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
}

.tag-chip {
  border: 1px solid var(--glass-stroke);
  background: var(--glass-elevated);
  color: var(--text-secondary);
}

.tag-chip.removable {
  cursor: pointer;
}

.tag-chip.muted {
  background: rgba(255, 255, 255, 0.05);
}

.selection-chip {
  border: 1px solid var(--glass-stroke);
  background: var(--glass-elevated);
  color: var(--text-primary);
  font-weight: 600;
}

.selection-chip input {
  accent-color: var(--accent-primary);
}

.progress-panel {
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
}

.progress-panel::after {
  content: '';
  position: absolute;
  inset: auto -40px -60px auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(96, 214, 170, 0.22), transparent 70%);
  opacity: 0;
  pointer-events: none;
}

.progress-panel.finished::after {
  animation: progress-bloom 0.9s ease-out;
}

.progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.progress-copy {
  display: grid;
  gap: 8px;
}

.progress-copy h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
}

.progress-copy p {
  margin: 0;
  color: var(--text-secondary);
}

.progress-overview {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.progress-overview strong {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1;
}

.progress-track {
  position: relative;
  height: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.progress-track.compact {
  height: 8px;
}

.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary) 52%, #78efd2);
  box-shadow: 0 0 28px rgba(84, 210, 172, 0.34);
  transition: width 0.28s ease;
  background-size: 180% 100%;
}

.progress-panel.state-running .progress-fill,
.task-progress.running .progress-fill {
  animation: progress-flow 1.2s linear infinite;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.progress-stat {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--glass-stroke);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.progress-stat span {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.progress-stat strong {
  color: var(--text-primary);
  font-size: 18px;
  line-height: 1.35;
}

.empty-copy {
  color: var(--text-secondary);
  font-size: 14px;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.list-toolbar-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.list-toolbar-copy {
  display: grid;
  gap: 6px;
}

.list-toolbar-copy strong {
  color: var(--text-primary);
  font-size: 15px;
}

.layout-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--glass-stroke);
  border-radius: 18px;
  background: var(--glass-elevated);
}

.compact-view-trigger {
  white-space: nowrap;
}

.layout-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast);
}

.layout-button:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
}

.layout-button.active {
  background: var(--accent-soft);
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
}

.checkin-board {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 18px;
}

.checkin-board.layout-list {
  grid-template-columns: 1fr;
}

.checkin-board.layout-card {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.checkin-card {
  display: grid;
  gap: 16px;
}

.card-top {
  display: grid;
  grid-template-columns: fit-content(60px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.card-copy {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.card-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.card-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  line-height: 1.2;
}

.card-url {
  margin: 0;
  color: var(--text-secondary);
  word-break: break-all;
}

.checkin-card.layout-list {
  grid-template-columns: fit-content(60px) minmax(220px, 250px) minmax(0, 1fr);
  grid-template-areas: 'main info result';
  align-items: stretch;
  gap: 12px;
  padding: 18px 20px;
}

.checkin-main {
  display: grid;
  width: fit-content;
  max-width: 60px;
  align-items: start;
}

.checkin-card.layout-list .checkin-main {
  grid-area: main;
}

.info-stack {
  display: grid;
  gap: 10px;
  min-width: 0;
  max-width: 250px;
}

.checkin-card.layout-list .info-stack {
  grid-area: info;
  align-content: start;
  width: 100%;
  height: 100%;
}

.select-badge {
  position: relative;
}

.select-badge input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.select-badge span {
  display: block;
  width: 22px;
  height: 22px;
  border: 1px solid var(--glass-border-strong);
  border-radius: 8px;
  background: var(--glass-elevated);
  box-shadow: inset 0 0 0 2px transparent;
}

.select-badge input:checked + span {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.88);
}

.title-copy h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
}

.title-copy p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  word-break: break-all;
}

.checkin-card.layout-list .title-copy h3 {
  font-size: 18px;
}

.checkin-card.layout-list .title-copy p {
  font-size: 13px;
}

.checkin-card.layout-list .status-bundle,
.checkin-card.layout-list .tag-cloud {
  gap: 8px;
}

.checkin-card.layout-list .status-bundle {
  justify-content: flex-start;
}

.checkin-card.layout-list .tag-chip,
.checkin-card.layout-list .status-chip {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.result-panel {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--glass-stroke);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
}

.result-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
  min-width: 0;
}

.checkin-card.layout-list .result-shell {
  grid-area: result;
  width: 100%;
  min-width: 0;
  align-self: stretch;
}

.checkin-card.layout-list .result-panel {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
  width: 100%;
  min-width: 0;
  height: 100%;
  align-content: start;
}

.result-stack {
  display: grid;
  gap: 10px;
  align-content: start;
}

.result-line,
.meta-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.result-line strong {
  color: var(--text-primary);
}

.task-progress {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--glass-stroke);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.045);
}

.task-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-progress-head span {
  color: var(--text-secondary);
  font-size: 13px;
}

.task-progress-head strong {
  color: var(--text-primary);
  font-size: 13px;
}

.task-progress.success {
  border-color: rgba(83, 204, 131, 0.26);
  background: rgba(83, 204, 131, 0.08);
}

.task-progress.failed {
  border-color: rgba(255, 104, 104, 0.24);
  background: rgba(255, 104, 104, 0.08);
}

.checkin-card.completed-flash {
  animation: card-finish-glow 0.86s ease;
}

.meta-line span {
  color: var(--text-secondary);
  font-size: 13px;
}

.response-box {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 14px;
  border-radius: 16px;
  background: rgba(7, 12, 24, 0.3);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.checkin-card.layout-list .response-box {
  max-height: 140px;
  padding: 10px 12px;
}

.status-chip {
  font-weight: 700;
}

.tone-success {
  background: rgba(83, 204, 131, 0.14);
  color: var(--success);
}

.tone-danger {
  background: rgba(255, 104, 104, 0.14);
  color: var(--danger);
}

.tone-warning {
  background: rgba(255, 182, 72, 0.14);
  color: var(--warning);
}

.tone-neutral {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.checkin-card.layout-card .status-line {
  justify-content: flex-end;
  gap: 8px;
}

.checkin-card.layout-card .card-category-cloud {
  gap: 8px;
}

.popup-split-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 4px;
  border: 1px solid var(--glass-border-strong);
  border-radius: 22px;
  background: var(--glass-surface-strong);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: var(--shadow-soft);
}

.popup-split-actions .glass-button {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 0 8px;
  gap: 6px;
  border: 0;
  border-radius: 18px;
  background: transparent;
  box-shadow: none;
  color: var(--text-secondary);
  white-space: nowrap;
}

.popup-split-actions .glass-button:hover:not(:disabled) {
  transform: translateY(-1px);
  color: var(--text-primary);
}

.popup-split-actions .glass-button span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-split-actions .button-primary {
  background: var(--accent-soft);
  color: var(--text-primary);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 8px 18px rgba(33, 52, 95, 0.12);
}

.popup-split-actions .button-secondary {
  border-color: transparent;
  background: transparent;
}

.popup-split-actions .button-danger {
  border-color: transparent;
  background: rgba(255, 110, 110, 0.12);
  color: var(--danger);
}

.checkin-card.layout-list .card-actions {
  align-self: stretch;
  justify-self: stretch;
}

.list-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  width: 132px;
  min-width: 132px;
  align-content: stretch;
}

.list-actions .glass-button {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
  white-space: nowrap;
}

.category-manager {
  display: grid;
  gap: 18px;
}

.category-manager-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.category-manager-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.empty-panel {
  display: flex;
  align-items: center;
  gap: 16px;
}

.empty-panel h3 {
  margin: 0 0 6px;
  color: var(--text-primary);
}

.empty-panel p {
  margin: 0;
  color: var(--text-secondary);
}

@keyframes progress-flow {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 180% 0;
  }
}

@keyframes progress-bloom {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.08);
  }
}

@keyframes card-finish-glow {
  0% {
    transform: translateY(0) scale(1);
    box-shadow: var(--shadow-soft);
  }
  40% {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 20px 44px rgba(84, 210, 172, 0.18);
  }
  100% {
    transform: translateY(0) scale(1);
    box-shadow: var(--shadow-soft);
  }
}

@media (max-width: 1280px) {
  .filter-head,
  .filter-tools {
    grid-template-columns: 1fr;
  }

  .filter-tools {
    display: grid;
    justify-content: stretch;
  }

  .filter-grid {
    grid-auto-flow: row;
    justify-content: stretch;
  }

  .field-fixed,
  .category-manage-trigger,
  .action-trigger {
    width: 100%;
  }
}

@media (max-width: 1080px) {
  .overview-panel,
  .progress-grid,
  .checkin-board.layout-card {
    grid-template-columns: 1fr;
  }

  .checkin-card.layout-list {
    grid-template-columns: fit-content(60px) minmax(0, 1fr);
    grid-template-areas:
      'main info'
      'result result'
  }

  .checkin-card.layout-list .info-stack {
    max-width: none;
  }
}

@media (max-width: 760px) {
  .overview-panel,
  .category-manager-input {
    grid-template-columns: 1fr;
  }

  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .progress-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-foot,
  .filter-tools {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .filter-tools {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .filter-grid {
    display: contents;
  }

  .action-trigger {
    grid-column: 1;
  }

  .category-manage-trigger {
    grid-column: 2;
  }

  .filter-grid > .field-fixed:first-of-type {
    grid-column: 1;
  }

  .filter-grid > .field-fixed:last-of-type {
    grid-column: 2;
  }

  .switch-pill {
    grid-column: 3;
    justify-self: stretch;
    justify-content: center;
    min-width: 0;
    padding-inline: 12px;
  }

  .action-trigger,
  .category-manage-trigger,
  .filter-grid > .field-fixed {
    width: 100%;
  }

  .filter-grid > .field-fixed {
    min-width: 0;
  }

  .list-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .list-toolbar-actions {
    justify-self: end;
  }

  .compact-view-trigger,
  .layout-switch,
  .list-toolbar-actions .switch-pill {
    width: auto;
    justify-content: flex-end;
    justify-self: end;
  }

  .layout-switch,
  .list-toolbar-actions .switch-pill {
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
  }

  .layout-button {
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 10px;
    gap: 6px;
    border-radius: 10px;
    justify-content: center;
  }

  .progress-overview {
    justify-items: start;
  }

  .checkin-card.layout-list {
    grid-template-columns: 1fr;
    grid-template-areas:
      'main'
      'info'
      'result';
  }

  .command-actions,
  .card-actions {
    flex-direction: row;
    align-items: stretch;
  }

  .command-actions .glass-button,
  .card-actions .glass-button {
    flex: 1 1 calc(50% - 6px);
    min-width: 0;
    justify-content: center;
  }

  .result-shell {
    grid-template-columns: 1fr;
  }

  .list-actions {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    min-width: 0;
  }

  .checkin-card.layout-card .status-bundle {
    justify-items: start;
  }

  .checkin-card.layout-card .status-line {
    justify-content: flex-end;
  }
}
</style>
