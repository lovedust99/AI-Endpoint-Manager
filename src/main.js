import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { VIEW_MODE_POPUP, getInitialViewMode } from './utils/viewMode'

const viewMode = getInitialViewMode()
document.documentElement.classList.add(viewMode === VIEW_MODE_POPUP ? 'extension-popup-mode' : 'standalone-mode')

createApp(App).mount('#app')
