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
            <span>端点总数</span>
            <strong>{{ state.endpoints.value.length }}</strong>
            <small>维护中的全部 API 节点</small>
          </article>
          <article class="feature-tile">
            <span>激活端点</span>
            <strong>{{ state.activeEndpointCount.value }}</strong>
            <small>当前启用状态的服务</small>
          </article>
        </div>
      </div>
    </section>

    <section class="glass-panel panel-pad filter-panel">
      <div class="filter-head">
        <div>
          <span class="section-kicker">Curated Filters</span>
          <h3>列表工具</h3>
        </div>
        <div class="filter-tools">
          <div class="filter-grid">
            <button class="glass-button button-primary action-trigger" type="button" @click="state.openEndpointDialog('add')">
              <Plus :size="16" />
              <span>添加端点</span>
            </button>

            <button class="glass-button button-secondary category-manage-trigger" type="button" @click="state.openEndpointCategoryManager()">
              <Settings2 :size="16" />
              <span>分类管理</span>
            </button>

            <label class="field-shell field-fixed">
              <AppSelect
                :model-value="endpointCategoryFilter"
                :options="endpointCategoryOptions"
                placeholder="选择分类"
                @update:model-value="setCategoryFilter"
              />
            </label>

            <label class="field-shell field-fixed">
              <AppSelect
                :model-value="endpointEnabledFilter"
                :options="endpointStatusOptions"
                placeholder="选择状态"
                @update:model-value="setEnabledFilter"
              />
            </label>
          </div>

        </div>
      </div>
    </section>

    <div class="list-toolbar">
      <div class="list-toolbar-copy">
        <span class="section-kicker">Display</span>
        <strong>当前共 {{ state.displayedEndpoints.value.length }} 项</strong>
      </div>

      <div class="list-toolbar-actions">
        <label class="switch-pill" :class="{ active: isEditMode }">
          <input :checked="isEditMode" type="checkbox" @change="setEditMode($event.target.checked)" />
          <span class="switch-track" />
          <span class="switch-label">{{ isEditMode ? '编辑模式' : '浏览模式' }}</span>
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
        <div v-else class="layout-switch" aria-label="切换端点列表布局">
          <button
            :class="['layout-button', { active: currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_LIST }]"
            type="button"
            :aria-pressed="currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_LIST"
            @click="setEndpointLayoutMode(state.ENDPOINT_LAYOUT_LIST)"
          >
            <Rows3 :size="16" />
            <span>列表</span>
          </button>
          <button
            :class="['layout-button', { active: currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_CARD }]"
            type="button"
            :aria-pressed="currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_CARD"
            @click="setEndpointLayoutMode(state.ENDPOINT_LAYOUT_CARD)"
          >
            <LayoutGrid :size="16" />
            <span>卡片</span>
          </button>
        </div>
      </div>
    </div>

    <draggable
      v-model="displayedEndpoints"
      item-key="id"
      handle=".drag-handle"
      :class="['endpoint-grid', `layout-${currentEndpointLayoutMode}`]"
      :disabled="!isEditMode"
      @end="state.saveEndpoints"
    >
      <template #item="{ element }">
        <article :class="['glass-card', 'endpoint-card', `layout-${currentEndpointLayoutMode}`]">
          <div class="endpoint-main">
            <div class="card-top">
              <template v-if="currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_CARD">
                <div class="card-heading">
                  <div class="card-title">
                    <button v-if="isEditMode" class="icon-control drag-handle" type="button" aria-label="拖拽排序">
                      <GripVertical :size="18" />
                    </button>
                    <div class="title-copy endpoint-card-copy">
                      <h3>{{ element.name || '未命名端点' }}</h3>
                    </div>
                  </div>

                  <div class="chip-row card-corner-chips">
                    <span :class="['status-chip', element.enabled === false ? 'tone-danger' : 'tone-success']">
                      {{ element.enabled === false ? '已禁用' : '已启用' }}
                    </span>
                    <span class="tag-chip muted">权重 {{ element.weight || 0 }}</span>
                  </div>
                </div>

                <div class="detail-row detail-row-baseurl card-url-row">
                  <div class="tag-cloud card-category-cloud">
                    <span v-for="category in state.displayCategories(element)" :key="category" class="tag-chip muted">
                      {{ category }}
                    </span>
                  </div>

                  <span class="detail-label">BaseURL</span>
                  <div class="baseurl-bar">
                    <button class="text-link mono" type="button" @click="state.copyText(element.baseUrl, 'BaseURL')">
                      {{ element.baseUrl }}
                    </button>
                    <div class="baseurl-menu-shell">
                      <button
                        :class="['icon-control', 'baseurl-menu-trigger', { open: openBaseUrlMenuId === element.id }]"
                        type="button"
                        aria-label="展开 BaseURL 复制选项"
                        @click.stop="toggleBaseUrlMenu(element.id)"
                      >
                        <ChevronDown :size="16" />
                      </button>

                      <div v-if="openBaseUrlMenuId === element.id" class="baseurl-menu">
                        <button class="baseurl-menu-item" type="button" @click="copyBaseUrlVariantAndClose(element.baseUrl, 'v1')">
                          <Copy :size="14" />
                          <span>复制 /v1</span>
                        </button>
                        <button class="baseurl-menu-item" type="button" @click="copyBaseUrlVariantAndClose(element.baseUrl, 'completion')">
                          <Copy :size="14" />
                          <span>复制 Completions</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="card-title">
                  <button v-if="isEditMode" class="icon-control drag-handle" type="button" aria-label="拖拽排序">
                    <GripVertical :size="18" />
                  </button>
                  <div class="title-copy">
                    <h3>{{ element.name || '未命名端点' }}</h3>
                    <p v-if="element.site">{{ element.site }}</p>
                  </div>
                </div>

                <div class="chip-row">
                  <span :class="['status-chip', element.enabled === false ? 'tone-danger' : 'tone-success']">
                    {{ element.enabled === false ? '已禁用' : '已启用' }}
                  </span>
                  <span v-for="category in state.displayCategories(element)" :key="category" class="tag-chip muted">
                    {{ category }}
                  </span>
                  <span class="tag-chip muted">权重 {{ element.weight || 0 }}</span>
                </div>
              </template>
            </div>

            <footer v-if="currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_LIST" class="main-actions">
              <button class="glass-button button-secondary" type="button" @click="state.openEndpointDialog('edit', element)">
                <Pencil :size="16" />
                <span>编辑</span>
              </button>
              <button class="glass-button button-secondary" type="button" @click="state.fetchModels(element)">
                <Sparkles :size="16" />
                <span>获取模型</span>
              </button>
            </footer>
          </div>

          <div class="endpoint-side">
            <div class="detail-list detail-list-extra">
            <div v-if="currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_LIST" class="detail-row detail-row-baseurl">
              <span class="detail-label">BaseURL</span>
              <div class="baseurl-bar">
                <button class="text-link mono" type="button" @click="state.copyText(element.baseUrl, 'BaseURL')">
                  {{ element.baseUrl }}
                </button>
                <div class="baseurl-menu-shell">
                  <button
                    :class="['icon-control', 'baseurl-menu-trigger', { open: openBaseUrlMenuId === element.id }]"
                    type="button"
                    aria-label="展开 BaseURL 复制选项"
                    @click.stop="toggleBaseUrlMenu(element.id)"
                  >
                    <ChevronDown :size="16" />
                  </button>

                  <div v-if="openBaseUrlMenuId === element.id" class="baseurl-menu">
                    <button class="baseurl-menu-item" type="button" @click="copyBaseUrlVariantAndClose(element.baseUrl, 'v1')">
                      <Copy :size="14" />
                      <span>复制 /v1</span>
                    </button>
                    <button class="baseurl-menu-item" type="button" @click="copyBaseUrlVariantAndClose(element.baseUrl, 'completion')">
                      <Copy :size="14" />
                      <span>复制 Completions</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="element.apiKey" class="detail-row">
              <span class="detail-label">API Key</span>
              <button class="text-link mono" type="button" @click="state.copyText(element.apiKey, 'API Key')">
                {{ state.maskSecret(element.apiKey) }}
              </button>
            </div>

            <footer v-if="currentEndpointLayoutMode === state.ENDPOINT_LAYOUT_CARD" class="main-actions card-inline-actions">
              <button class="glass-button button-secondary" type="button" @click="state.openEndpointDialog('edit', element)">
                <Pencil :size="16" />
                <span>编辑</span>
              </button>
              <button class="glass-button button-secondary" type="button" @click="state.fetchModels(element)">
                <Sparkles :size="16" />
                <span>获取模型</span>
              </button>
            </footer>

            <div v-if="currentEndpointLayoutMode !== state.ENDPOINT_LAYOUT_LIST && element.site" class="detail-row">
              <span class="detail-label">原站点</span>
              <button class="text-link" type="button" @click="state.openUrl(element.site)">
                <ExternalLink :size="15" />
                <span>{{ element.site }}</span>
              </button>
            </div>

            <div v-if="element.remark" class="detail-row">
              <span class="detail-label">备注</span>
              <button class="text-link" type="button" @click="state.showFullRemark(element.remark)">
                {{ state.truncateText(element.remark, 54) }}
              </button>
            </div>
            </div>

            <footer class="card-actions">
              <button v-if="isEditMode" class="glass-button button-danger" type="button" @click="state.deleteEndpoint(element)">
                <Trash2 :size="16" />
                <span>删除</span>
              </button>
            </footer>
          </div>
        </article>
      </template>
    </draggable>

    <section v-if="state.displayedEndpoints.value.length === 0" class="glass-panel panel-pad empty-panel">
      <Server :size="28" />
      <div>
        <h3>当前筛选下没有端点</h3>
        <p>可以调整当前显示条件，或者从右上角新增一个端点。</p>
      </div>
    </section>

    <AppModal
      :model-value="endpointCategoryManagerVisible"
      title="端点分类管理"
      eyebrow="Category Manager"
      description="统一新增或删除端点分类，避免在列表工具区域里误创建无效分类。"
      size="md"
      @close="state.closeEndpointCategoryManager()"
    >
      <div class="category-manager">
        <div class="category-manager-input">
          <input
            :value="endpointCategoryInput"
            class="glass-input"
            placeholder="输入端点分类，例如：官方、备用、国内中转"
            @input="setCategoryInput($event.target.value)"
            @keydown.enter.prevent="state.addCategory('endpoint')"
          />
          <button class="glass-button button-primary" type="button" @click="state.addCategory('endpoint')">
            <Plus :size="16" />
            <span>添加分类</span>
          </button>
        </div>

        <div class="tag-cloud">
          <button
            v-for="category in state.endpointCategoryOptions.value"
            :key="category"
            class="tag-chip removable"
            type="button"
            @click="state.removeCategory('endpoint', category)"
          >
            <span>{{ category }}</span>
            <X :size="14" />
          </button>
          <span v-if="state.endpointCategoryOptions.value.length === 0" class="empty-copy">暂无分类</span>
        </div>
      </div>
    </AppModal>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import draggable from 'vuedraggable'
import {
  ChevronDown,
  Copy,
  ExternalLink,
  GripVertical,
  LayoutGrid,
  Monitor,
  Pencil,
  Plus,
  Rows3,
  Server,
  Settings2,
  Sparkles,
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

const openBaseUrlMenuId = ref(null)
const isEditMode = computed(() => props.state.isEditMode.value)
const isPopupView = computed(() => props.state.isPopup.value)
const currentEndpointLayoutMode = computed(() => (
  isPopupView.value ? props.state.ENDPOINT_LAYOUT_CARD : props.state.endpointLayoutMode.value
))
const endpointCategoryManagerVisible = computed(() => props.state.endpointCategoryManagerVisible.value)
const endpointCategoryFilter = computed(() => props.state.endpointCategoryFilter.value)
const endpointEnabledFilter = computed(() => props.state.endpointEnabledFilter.value)
const endpointCategoryInput = computed(() => props.state.endpointCategoryInput.value)
const endpointCategoryOptions = computed(() => [
  { label: '全部分类', value: props.state.CATEGORY_ALL },
  { label: '未分类', value: props.state.CATEGORY_NONE },
  ...props.state.endpointCategoryOptions.value.map((category) => ({ label: category, value: category }))
])

const endpointStatusOptions = [
  { label: '仅启用', value: props.state.STATUS_FILTER_ENABLED },
  { label: '仅禁用', value: props.state.STATUS_FILTER_DISABLED },
  { label: '全部状态', value: props.state.STATUS_FILTER_ALL }
]

const displayedEndpoints = computed({
  get: () => props.state.displayedEndpoints.value,
  set: (value) => {
    props.state.displayedEndpoints.value = value
  }
})

const closeBaseUrlMenu = () => {
  openBaseUrlMenuId.value = null
}

const toggleBaseUrlMenu = (id) => {
  openBaseUrlMenuId.value = openBaseUrlMenuId.value === id ? null : id
}

const copyBaseUrlVariantAndClose = (baseUrl, variant) => {
  props.state.copyBaseUrlVariant(baseUrl, variant)
  closeBaseUrlMenu()
}

const handleDocumentPointerDown = (event) => {
  if (!event.target.closest('.baseurl-menu-shell')) closeBaseUrlMenu()
}

const setEditMode = (value) => {
  props.state.isEditMode.value = value
}

const setEndpointLayoutMode = (value) => {
  if (isPopupView.value) return
  props.state.endpointLayoutMode.value = value
}

const setCategoryFilter = (value) => {
  props.state.endpointCategoryFilter.value = value
}

const setEnabledFilter = (value) => {
  props.state.endpointEnabledFilter.value = value
}

const setCategoryInput = (value) => {
  props.state.endpointCategoryInput.value = value
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<style scoped lang="scss">
.view-stack {
  display: grid;
  gap: 20px;
}

.feature-tile span,
.field-shell span,
.detail-label,
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
  grid-template-columns: minmax(0, 1.3fr) minmax(360px, 0.95fr);
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
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
  min-width: 122px;
  white-space: nowrap;
}

.action-trigger:hover {
  box-shadow: 0 18px 34px rgba(92, 126, 255, 0.3);
  filter: saturate(1.06);
}

.switch-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--glass-stroke);
  border-radius: 999px;
  background: var(--glass-elevated);
  width: fit-content;
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

.tag-cloud,
.chip-row,
.action-mini-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--glass-stroke);
  border-radius: 999px;
  background: var(--glass-elevated);
  color: var(--text-secondary);
  font-size: 13px;
}

.tag-chip.removable {
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    color var(--motion-fast);
}

.tag-chip.removable:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 117, 117, 0.45);
  color: var(--text-primary);
}

.tag-chip.muted {
  background: rgba(255, 255, 255, 0.05);
}

.empty-copy {
  color: var(--text-secondary);
  font-size: 14px;
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

.endpoint-grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 18px;
}

.endpoint-grid.layout-card {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.endpoint-grid.layout-list {
  grid-template-columns: 1fr;
}

.endpoint-card {
  display: grid;
  gap: 18px;
  min-height: 100%;
}

.endpoint-main,
.endpoint-side {
  display: grid;
  gap: 18px;
}

.main-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.card-inline-actions {
  padding-top: 2px;
}

.endpoint-card.layout-list {
  grid-template-columns: minmax(320px, 1fr) minmax(320px, 0.95fr);
  align-items: start;
}

.card-top {
  display: grid;
  gap: 16px;
}

.card-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.card-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title-copy {
  display: grid;
  gap: 6px;
  flex: 1;
}

.title-copy h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
}

.title-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.endpoint-card-copy {
  min-width: 0;
}

.card-corner-chips {
  justify-content: flex-end;
  gap: 8px;
}

.card-url-row {
  gap: 10px;
}

.card-category-cloud {
  gap: 8px;
}

.icon-control {
  width: 40px;
  height: 40px;
  border: 1px solid var(--glass-stroke);
  border-radius: 14px;
  background: var(--glass-elevated);
  color: var(--text-secondary);
}

.detail-list {
  display: grid;
  gap: 14px;
}

.detail-list-extra {
  align-content: start;
}

.detail-row {
  display: grid;
  gap: 8px;
}

.baseurl-bar {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
}

.baseurl-menu-shell {
  position: relative;
}

.baseurl-menu-trigger {
  width: 36px;
  height: 36px;
}

.baseurl-menu-trigger.open {
  border-color: var(--accent-border);
  background: var(--glass-surface);
}

.baseurl-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: grid;
  gap: 8px;
  min-width: 188px;
  padding: 10px;
  border: 1px solid var(--glass-border-strong);
  border-radius: 18px;
  background: var(--glass-surface-strong);
  backdrop-filter: blur(18px) saturate(1.15);
  box-shadow: var(--shadow-float);
}

.baseurl-menu-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast);
}

.baseurl-menu-item:hover {
  transform: translateY(-1px);
  border-color: var(--accent-border);
  background: rgba(255, 255, 255, 0.06);
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.mono {
  font-family: var(--font-mono);
  word-break: break-all;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.endpoint-card.layout-list .card-actions {
  justify-content: flex-end;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
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

@media (max-width: 980px) {
  .overview-panel,
  .filter-tools {
    grid-template-columns: 1fr;
  }

  .overview-metrics,
  .endpoint-grid.layout-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .endpoint-card.layout-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .endpoint-grid.layout-card,
  .category-manager-input {
    grid-template-columns: 1fr;
  }

  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-tools {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
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
    grid-auto-flow: row;
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

  .main-actions,
  .card-actions {
    flex-direction: row;
    align-items: stretch;
  }

  .main-actions .glass-button,
  .card-actions .glass-button {
    flex: 1 1 calc(50% - 6px);
    min-width: 0;
    justify-content: center;
  }
}
</style>
