<template>
  <div ref="shellRef" :class="['app-shell', { 'popup-mode': state.isPopup.value }]">
    <div class="ambient ambient-a" />
    <div class="ambient ambient-b" />

    <header ref="headerRef" class="app-header glass-panel">
      <div class="header-brand">
        <div class="brand-mark">
          <img src="/icon.png" alt="端点管理" />
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">AI Infrastructure</span>
          <h1>端点管理</h1>
        </div>
      </div>

      <div class="header-actions">
        <button
          v-if="state.isPopup.value"
          class="glass-button button-secondary view-mode-button"
          type="button"
          aria-label="切换到大屏模式"
          title="切到大屏"
          @click="state.openStandaloneMode()"
        >
          <Monitor :size="16" />
          <span>切到大屏</span>
        </button>

        <ThemeSwitcher
          v-model="state.themePreference.value"
          :options="themeOptions"
          compact-on-mobile
        />
      </div>

      <nav v-if="state.isPopup.value" class="nav-stack" aria-label="主导航">
        <button
          v-for="item in navItems"
          :key="item.key"
          :class="['nav-item', { active: state.activeTab.value === item.key }]"
          type="button"
          @click="state.activeTab.value = item.key"
        >
          <component :is="item.icon" :size="18" />
          <div>
            <strong>{{ item.label }}</strong>
            <span>{{ item.hint }}</span>
          </div>
        </button>
      </nav>
    </header>

    <aside v-if="!state.isPopup.value" class="app-sidebar">
      <nav class="nav-stack" aria-label="主导航">
        <button
          v-for="item in navItems"
          :key="item.key"
          :class="['nav-item', { active: state.activeTab.value === item.key }]"
          type="button"
          @click="state.activeTab.value = item.key"
        >
          <component :is="item.icon" :size="18" />
          <div>
            <strong>{{ item.label }}</strong>
            <span>{{ item.hint }}</span>
          </div>
        </button>
      </nav>
    </aside>

    <main class="app-main">
      <EndpointSection v-if="state.activeTab.value === 'endpoints'" :state="state" />
      <CheckinSection v-else-if="state.activeTab.value === 'checkin'" :state="state" />
      <SettingsSection v-else :state="state" />
    </main>

    <EndpointDialog :state="state" />
    <CheckinDialog :state="state" />
    <ExportDialog :state="state" />
    <RemarkDialog :state="state" />
    <ModelsDialog :state="state" />
    <ModelTestDialog :state="state" />
    <ConfirmDialog :state="state" />
    <ToastStack :toasts="state.toasts.value" @dismiss="state.dismissToast" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Monitor, MoonStar, Server, Settings2, SunMedium, Waypoints } from 'lucide-vue-next'
import { useManagerState } from './composables/useManagerState'
import EndpointSection from './components/views/EndpointSection.vue'
import CheckinSection from './components/views/CheckinSection.vue'
import SettingsSection from './components/views/SettingsSection.vue'
import EndpointDialog from './components/dialogs/EndpointDialog.vue'
import CheckinDialog from './components/dialogs/CheckinDialog.vue'
import ExportDialog from './components/dialogs/ExportDialog.vue'
import RemarkDialog from './components/dialogs/RemarkDialog.vue'
import ModelsDialog from './components/dialogs/ModelsDialog.vue'
import ModelTestDialog from './components/dialogs/ModelTestDialog.vue'
import ConfirmDialog from './components/dialogs/ConfirmDialog.vue'
import ToastStack from './components/ui/ToastStack.vue'
import ThemeSwitcher from './components/ui/ThemeSwitcher.vue'

const state = useManagerState()
const shellRef = ref(null)
const headerRef = ref(null)
let headerObserver = null

const syncHeaderOffset = () => {
  if (!shellRef.value || !headerRef.value) return
  shellRef.value.style.setProperty('--app-header-height', `${headerRef.value.offsetHeight}px`)
}

const navItems = [
  { key: 'endpoints', label: '端点管理', hint: 'BaseURL、密钥与模型测试', icon: Server },
  { key: 'checkin', label: '一键签到', hint: '任务卡片与执行结果', icon: Waypoints },
  { key: 'settings', label: '系统设置', hint: '导入导出与本地缓存', icon: Settings2 }
]

const themeOptions = [
  { value: state.THEME_LIGHT, label: '明亮', icon: SunMedium },
  { value: state.THEME_DARK, label: '暗黑', icon: MoonStar },
  { value: state.THEME_SYSTEM, label: '自动', icon: Monitor }
]

onMounted(() => {
  syncHeaderOffset()
  headerObserver = new ResizeObserver(() => {
    syncHeaderOffset()
  })
  if (headerRef.value) headerObserver.observe(headerRef.value)
  window.addEventListener('resize', syncHeaderOffset)
})

onBeforeUnmount(() => {
  headerObserver?.disconnect()
  window.removeEventListener('resize', syncHeaderOffset)
})
</script>

<style scoped lang="scss">
.app-shell {
  --app-header-height: 92px;

  position: relative;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 22px;
  min-height: 100vh;
  padding: calc(var(--app-header-height) + 46px) 24px 24px;
}

.ambient {
  position: fixed;
  pointer-events: none;
  border-radius: 999px;
  filter: blur(18px);
  opacity: 0.72;
}

.ambient-a {
  top: -80px;
  left: -40px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(107, 143, 255, 0.22), transparent 68%);
  animation: float-a 14s ease-in-out infinite;
}

.ambient-b {
  right: -60px;
  bottom: -100px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(73, 228, 188, 0.2), transparent 68%);
  animation: float-b 16s ease-in-out infinite;
}

.app-header {
  position: fixed;
  top: 24px;
  left: 24px;
  right: 24px;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(240px, 320px) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  grid-column: 1 / -1;
}

.app-sidebar {
  position: fixed;
  left: 24px;
  top: calc(var(--app-header-height) + 46px);
  z-index: 9;
  display: grid;
  align-content: start;
  gap: 14px;
  width: 320px;
  max-height: calc(100vh - var(--app-header-height) - 70px);
  overflow: auto;
}

.header-brand {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.brand-mark {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-kicker {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.brand-copy h1 {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.nav-stack {
  display: grid;
  gap: 10px;
}

.nav-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid transparent;
  border-radius: 22px;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast);
}

.nav-item:hover {
  transform: translateY(-2px);
  border-color: var(--glass-stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.nav-item.active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
}

.nav-item strong {
  display: block;
  font-size: 15px;
}

.nav-item span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.86;
}

.app-main {
  display: grid;
  grid-column: 2;
  align-content: start;
  min-width: 0;
}

@keyframes float-a {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(26px, 34px, 0);
  }
}

@keyframes float-b {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(-30px, -24px, 0);
  }
}

@media (max-width: 1080px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    max-height: none;
    overflow: visible;
  }

  .nav-stack {
    position: relative;
    top: auto;
  }

  .app-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .app-main {
    grid-column: 1;
  }

  .header-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .app-shell {
    padding: calc(var(--app-header-height) + 28px) 14px 14px;
  }

  .app-header {
    top: 14px;
    left: 14px;
    right: 14px;
    padding: 14px;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }

  .header-actions {
    width: auto;
    justify-self: end;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .header-brand {
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 10px;
    min-width: 0;
  }

  .brand-mark {
    width: 52px;
    height: 52px;
    border-radius: 18px;
  }

  .brand-copy {
    min-width: 0;
  }

  .brand-kicker {
    display: none;
  }

  .brand-copy h1 {
    font-size: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .view-mode-button {
    min-height: 38px;
    padding: 0 10px;
    border-radius: 14px;
    gap: 6px;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .view-mode-button span {
    display: inline;
    font-size: 12px;
  }

  .page-actions {
    width: 100%;
  }

  .page-actions > * {
    flex: 1 1 100%;
  }
}

.app-shell.popup-mode {
  padding: calc(var(--app-header-height) + 22px) 14px 14px;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.app-shell.popup-mode .app-header {
  top: 14px;
  left: 14px;
  right: 14px;
  padding: 14px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.app-shell.popup-mode .app-main {
  grid-column: 1;
}

.app-shell.popup-mode .header-actions {
  width: auto;
  justify-self: end;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 8px;
}

.app-shell.popup-mode .nav-stack {
  display: flex;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  padding-top: 2px;
  scrollbar-width: none;
}

.app-shell.popup-mode .nav-stack::-webkit-scrollbar {
  display: none;
}

.app-shell.popup-mode .nav-item {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 16px;
  text-align: center;
}

.app-shell.popup-mode .nav-item > div {
  min-width: 0;
}

.app-shell.popup-mode .nav-item strong {
  font-size: 13px;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell.popup-mode .nav-item span {
  display: none;
}
</style>
