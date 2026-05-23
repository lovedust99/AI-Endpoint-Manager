import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { VIEW_MODE_POPUP, VIEW_MODE_STANDALONE, getInitialViewMode } from '../utils/viewMode'

const ENDPOINTS_KEY = 'endpointsData'
const CHECKIN_SITES_KEY = 'checkinSitesData'
const ENDPOINT_CATEGORIES_KEY = 'endpointCategoriesData'
const CHECKIN_CATEGORIES_KEY = 'checkinCategoriesData'
const ENDPOINT_DRAFT_KEY = 'formDraft'
const CHECKIN_DRAFT_KEY = 'checkinFormDraft'
const APP_SETTINGS_KEY = 'appSettings'
const POPUP_BROWSING_STATE_KEY = 'popupBrowsingState'
const CHECKIN_TIMEOUT_MS = 30000
const POPUP_BROWSING_MAX_AGE_MS = 3 * 60 * 1000
const POPUP_SCROLL_SAVE_DELAY_MS = 120

const CATEGORY_ALL = '__all__'
const CATEGORY_NONE = '__none__'
const STATUS_FILTER_ENABLED = '__enabled__'
const STATUS_FILTER_DISABLED = '__disabled__'
const STATUS_FILTER_ALL = '__status_all__'

const THEME_LIGHT = 'light'
const THEME_DARK = 'dark'
const THEME_SYSTEM = 'system'
const ENDPOINT_LAYOUT_LIST = 'list'
const ENDPOINT_LAYOUT_CARD = 'card'
const CHECKIN_LAYOUT_LIST = 'list'
const CHECKIN_LAYOUT_CARD = 'card'

const defaultEndpointForm = () => ({
  id: '',
  name: '',
  category: '',
  categories: [],
  baseUrl: '',
  apiKey: '',
  site: '',
  remark: '',
  weight: 0,
  enabled: true
})

const defaultCheckinForm = () => ({
  id: '',
  name: '',
  category: '',
  categories: [],
  platform: 'new-api',
  baseUrl: '',
  apiKey: '',
  userId: '',
  enabled: true,
  remark: '',
  request: {
    inputMode: 'fields',
    commandText: '',
    url: '',
    method: 'POST',
    headersText: '',
    bodyText: '',
    successKeywords: '',
    failureKeywords: ''
  }
})

const buildCheckinBatchProgress = () => ({
  visible: false,
  mode: 'idle',
  label: '',
  total: 0,
  completed: 0,
  success: 0,
  failed: 0,
  percent: 0,
  currentSiteName: '',
  finished: false
})

const clone = (value) => JSON.parse(JSON.stringify(value))
const normalizeCategory = (value) => String(value || '').trim()
const normalizeThemePreference = (value) => [THEME_LIGHT, THEME_DARK, THEME_SYSTEM].includes(value) ? value : THEME_SYSTEM
const normalizeActiveTab = (value) => ['endpoints', 'checkin', 'settings'].includes(value) ? value : 'endpoints'

const mergeCategories = (...lists) => {
  const set = new Set()
  lists.flat().forEach((item) => {
    const category = normalizeCategory(item)
    if (category) set.add(category)
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

const normalizeCategories = (value, fallback = '') => {
  const list = Array.isArray(value) ? value : [value || fallback]
  return mergeCategories(list)
}

const normalizeEndpoint = (endpoint = {}) => {
  const categories = normalizeCategories(endpoint.categories, endpoint.category)
  return {
    ...defaultEndpointForm(),
    ...endpoint,
    categories,
    category: categories[0] || '',
    enabled: endpoint.enabled !== false
  }
}

const normalizeCheckinSite = (site = {}) => {
  const categories = normalizeCategories(site.categories, site.category)
  return {
    ...defaultCheckinForm(),
    ...site,
    categories,
    category: categories[0] || '',
    request: {
      ...defaultCheckinForm().request,
      ...(site.request || {})
    },
    enabled: site.enabled !== false
  }
}

const normalizeConcurrency = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 2
  return Math.min(10, Math.max(1, Math.trunc(numeric)))
}

const normalizeCheckinLayout = (value) => {
  if (value === CHECKIN_LAYOUT_CARD || value === CHECKIN_LAYOUT_LIST) return value
  return CHECKIN_LAYOUT_CARD
}

const normalizeEndpointLayout = (value) => {
  if (value === ENDPOINT_LAYOUT_CARD || value === ENDPOINT_LAYOUT_LIST) return value
  return ENDPOINT_LAYOUT_CARD
}

const processBaseUrl = (url) => {
  if (!url) return ''
  return url.trim().replace(/\/api\/?$/, '').replace(/\/v1\/?$/, '').replace(/\/$/, '')
}

const maskSecret = (key) => {
  if (!key || key.length <= 8) return '******'
  return `${key.slice(0, 6)}******${key.slice(-2)}`
}

const truncateText = (text, len) => {
  if (!text) return ''
  return text.length > len ? `${text.slice(0, len)}...` : text
}

const matchesCategory = (item, filter) => {
  if (!filter || filter === CATEGORY_ALL) return true
  const categories = normalizeCategories(item.categories, item.category)
  if (filter === CATEGORY_NONE) return categories.length === 0
  return categories.includes(filter)
}

const matchesEnabled = (item, filter) => {
  const enabled = item.enabled !== false
  if (filter === STATUS_FILTER_DISABLED) return !enabled
  if (filter === STATUS_FILTER_ALL) return true
  return enabled
}

const removeCategoryFromItem = (item, category) => {
  const categories = normalizeCategories(item.categories, item.category).filter((value) => value !== category)
  return {
    ...item,
    categories,
    category: categories[0] || ''
  }
}

const splitKeywords = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean)

const ignoredRequestHeaderNames = new Set([
  'authority',
  'connection',
  'content-length',
  'host',
  'method',
  'origin',
  'path',
  'referer',
  'scheme',
  'user-agent'
])

const ignoredRequestHeaderPrefixes = ['sec-', 'proxy-']
const curlMethodFlags = new Set(['-X', '--request'])
const curlHeaderFlags = new Set(['-H', '--header'])
const curlBodyFlags = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode'])

const chromeStorageAvailable = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local

const storageGet = (keys) => new Promise((resolve) => {
  if (chromeStorageAvailable()) {
    chrome.storage.local.get(keys, resolve)
    return
  }

  const result = {}
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    result[key] = raw ? JSON.parse(raw) : undefined
  }
  resolve(result)
})

const storageSet = (payload) => new Promise((resolve) => {
  if (chromeStorageAvailable()) {
    chrome.storage.local.set(payload, resolve)
    return
  }

  Object.entries(payload).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value))
  })
  resolve()
})

const storageRemove = (keys) => new Promise((resolve) => {
  if (chromeStorageAvailable()) {
    chrome.storage.local.remove(keys, resolve)
    return
  }

  keys.forEach((key) => localStorage.removeItem(key))
  resolve()
})

const readPopupBrowsingState = () => {
  try {
    const raw = localStorage.getItem(POPUP_BROWSING_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const savedAt = Number(parsed?.savedAt)
    const scrollTop = Number(parsed?.scrollTop)
    return {
      activeTab: normalizeActiveTab(parsed?.activeTab),
      savedAt: Number.isFinite(savedAt) ? savedAt : 0,
      scrollTop: Number.isFinite(scrollTop) ? Math.max(0, Math.trunc(scrollTop)) : 0
    }
  } catch (error) {
    console.error('读取小窗浏览状态失败:', error)
    return null
  }
}

const writePopupBrowsingState = (value) => {
  try {
    if (!value) {
      localStorage.removeItem(POPUP_BROWSING_STATE_KEY)
      return
    }

    localStorage.setItem(POPUP_BROWSING_STATE_KEY, JSON.stringify(value))
  } catch (error) {
    console.error('保存小窗浏览状态失败:', error)
  }
}

const parseHeaders = (headersText = '') => {
  const text = headersText.trim()
  if (!text) return {}

  const appendHeader = (headers, rawKey, rawValue) => {
    const key = String(rawKey || '').trim()
    if (!key) return headers

    const normalizedKey = key.toLowerCase()
    if (
      key.startsWith(':') ||
      ignoredRequestHeaderNames.has(normalizedKey) ||
      ignoredRequestHeaderPrefixes.some((prefix) => normalizedKey.startsWith(prefix))
    ) {
      return headers
    }

    headers[key] = String(rawValue ?? '').trim()
    return headers
  }

  if (text.startsWith('{')) {
    const parsed = JSON.parse(text)
    return Object.entries(parsed).reduce((headers, [key, value]) => appendHeader(headers, key, value), {})
  }

  return text.split('\n').reduce((headers, line) => {
    const trimmed = line.trim()
    if (!trimmed) return headers
    const index = trimmed.indexOf(':')
    if (index <= 0) {
      if (trimmed.startsWith(':')) return headers
      throw new Error(`请求头格式错误: ${trimmed}`)
    }
    return appendHeader(headers, trimmed.slice(0, index), trimmed.slice(index + 1))
  }, {})
}

const headersToText = (headers = {}) => Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\n')

const normalizeCommandText = (commandText = '') => commandText
  .replace(/\r\n/g, '\n')
  .replace(/\\\s*\n/g, ' ')
  .replace(/\^\s*\n/g, ' ')
  .trim()

const tokenizeShellCommand = (commandText = '') => {
  const tokens = []
  let current = ''
  let quote = null

  for (let i = 0; i < commandText.length; i += 1) {
    const char = commandText[i]

    if (quote === "'") {
      if (char === "'") quote = null
      else current += char
      continue
    }

    if (quote === '"') {
      if (char === '\\' && i + 1 < commandText.length) {
        current += commandText[i + 1]
        i += 1
        continue
      }
      if (char === '"') quote = null
      else current += char
      continue
    }

    if (char === "'" || char === '"') {
      quote = char
      continue
    }

    if (char === '\\' && i + 1 < commandText.length) {
      current += commandText[i + 1]
      i += 1
      continue
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (quote) throw new Error('命令中的引号没有正确闭合')
  if (current) tokens.push(current)
  return tokens
}

const readCurlArgValue = (tokens, index) => {
  const token = tokens[index]
  if (!token) throw new Error('curl 参数缺少值')

  const joinedPrefixes = [
    '-X',
    '-H',
    '-d',
    '--request=',
    '--header=',
    '--data=',
    '--data-raw=',
    '--data-binary=',
    '--data-ascii=',
    '--data-urlencode=',
    '--url='
  ]

  for (const prefix of joinedPrefixes) {
    if (token.startsWith(prefix) && token !== prefix) {
      return { value: token.slice(prefix.length), nextIndex: index }
    }
  }

  const nextValue = tokens[index + 1]
  if (nextValue == null) throw new Error(`参数 ${token} 缺少值`)
  return { value: nextValue, nextIndex: index + 1 }
}

const parseCurlCommand = (commandText = '') => {
  const normalized = normalizeCommandText(commandText)
  const tokens = tokenizeShellCommand(normalized)

  if (!tokens.length || !/^curl(?:\.exe)?$/i.test(tokens[0])) {
    throw new Error('目前只支持解析以 curl 开头的完整请求命令')
  }

  const headers = []
  const bodyParts = []
  let url = ''
  let method = ''

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i]

    if (curlMethodFlags.has(token) || token.startsWith('--request=') || (token.startsWith('-X') && token !== '-X')) {
      const { value, nextIndex } = readCurlArgValue(tokens, i)
      method = value.toUpperCase()
      i = nextIndex
      continue
    }

    if (curlHeaderFlags.has(token) || token.startsWith('--header=') || (token.startsWith('-H') && token !== '-H')) {
      const { value, nextIndex } = readCurlArgValue(tokens, i)
      headers.push(value)
      i = nextIndex
      continue
    }

    if (
      curlBodyFlags.has(token) ||
      token.startsWith('--data=') ||
      token.startsWith('--data-raw=') ||
      token.startsWith('--data-binary=') ||
      token.startsWith('--data-ascii=') ||
      token.startsWith('--data-urlencode=') ||
      (token.startsWith('-d') && token !== '-d')
    ) {
      const { value, nextIndex } = readCurlArgValue(tokens, i)
      bodyParts.push(value)
      if (!method) method = 'POST'
      i = nextIndex
      continue
    }

    if (token === '--url' || token.startsWith('--url=')) {
      const { value, nextIndex } = readCurlArgValue(tokens, i)
      url = value
      i = nextIndex
      continue
    }

    if (!token.startsWith('-') && !url) {
      url = token
    }
  }

  if (!url) throw new Error('未能从 curl 命令中解析出请求地址')

  return {
    url,
    method: method || 'GET',
    headersText: headersToText(parseHeaders(headers.join('\n'))),
    bodyText: bodyParts.join('&')
  }
}

const requestWithTimeout = async (url, options = {}) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), CHECKIN_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

const parseFetchResponse = async (res) => {
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    data = null
  }
  return { status: res.status, ok: res.ok, data, text }
}

const parseModelTestResponse = async (res) => {
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    data = null
  }

  return {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries()),
    data,
    text
  }
}

const newApiHeaders = (site) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: site.apiKey.startsWith('Bearer ') ? site.apiKey : `Bearer ${site.apiKey}`
  }
  if (site.userId) headers['New-Api-User'] = site.userId
  return headers
}

const summarizeNewApiResponse = (response, ok, alreadyChecked) => {
  const payload = response.data || {}
  if (alreadyChecked) return '今日已签到'
  if (ok && payload.data?.quota_awarded != null) return `签到成功，获得额度 ${payload.data.quota_awarded}`
  if (ok && payload.quota_awarded != null) return `签到成功，获得额度 ${payload.quota_awarded}`
  if (ok) return `HTTP ${response.status}，签到成功`
  return payload.message || payload.error || `HTTP ${response.status}，签到失败`
}

const summarizeCustomCheckinResponse = (response, ok, hasFailureKeyword) => {
  const payload = response.data || {}
  const message = payload.msg || payload.message || payload.error
  if (ok) return message || `HTTP ${response.status}，签到请求成功`
  if (hasFailureKeyword) return `HTTP ${response.status}，命中失败关键词`
  return message || `HTTP ${response.status}，签到请求失败`
}

const scriptSafeSites = (sites) => sites.map((site) => {
  if (site.platform === 'new-api') {
    return {
      name: site.name,
      platform: 'new-api',
      baseUrl: processBaseUrl(site.baseUrl),
      apiKey: site.apiKey,
      userId: site.userId || ''
    }
  }

  return {
    name: site.name,
    platform: 'custom',
    request: {
      url: site.request.url,
      method: site.request.method,
      headers: parseHeaders(site.request.headersText),
      body: site.request.bodyText,
      successKeywords: splitKeywords(site.request.successKeywords),
      failureKeywords: splitKeywords(site.request.failureKeywords)
    }
  }
})

const generateQinglongScript = (sites, checkinConcurrency) => {
  let safeSites = []

  try {
    safeSites = scriptSafeSites(sites)
  } catch (error) {
    return `// 请求头解析失败：${error.message}`
  }

  return `/**
 * API 中转站一键签到
 * 青龙运行方式：新建 JS 脚本，任务命令填写 task api-endpoint-checkin.js
 * 注意：Cron 请在青龙定时任务中单独填写，脚本内不包含定时配置。
 */

const CONCURRENCY = ${normalizeConcurrency(checkinConcurrency)};
const SITES = ${JSON.stringify(safeSites, null, 2)};

const withBearer = (token) => /^Bearer\\s+/i.test(token) ? token : \`Bearer \${token}\`;
const normalizeBaseUrl = (url) => url.replace(/\\/api\\/?$/, '').replace(/\\/v1\\/?$/, '').replace(/\\/$/, '');

async function readResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {}
  return { status: res.status, ok: res.ok, data, text };
}

async function runSite(site) {
  if (site.platform === 'new-api') {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: withBearer(site.apiKey)
    };
    if (site.userId) headers['New-Api-User'] = site.userId;
    const response = await fetch(\`\${normalizeBaseUrl(site.baseUrl)}/api/user/checkin\`, { method: 'POST', headers });
    const output = await readResponse(response);
    const text = output.text || JSON.stringify(output.data || {});
    const already = /已签到|already/i.test(text);
    const businessOk = output.data && output.data.success !== false;
    const ok = output.ok && (businessOk || already || !output.data);
    return { name: site.name, ok, output };
  }

  const request = site.request;
  const options = { method: request.method || 'GET', headers: request.headers || {} };
  if (!['GET', 'HEAD'].includes(options.method.toUpperCase()) && request.body) {
    options.body = request.body;
  }
  const response = await fetch(request.url, options);
  const output = await readResponse(response);
  const text = output.text || JSON.stringify(output.data || {});
  const failed = (request.failureKeywords || []).some((keyword) => text.includes(keyword));
  const successWords = request.successKeywords || [];
  const matchedSuccess = successWords.length === 0 || successWords.some((keyword) => text.includes(keyword));
  return { name: site.name, ok: output.ok && !failed && matchedSuccess, output };
}

async function runConcurrent(items, limit, task) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        const result = await task(item);
        console.log(\`[\${result.ok ? 'OK' : 'FAIL'}] \${result.name}: HTTP \${result.output.status}\`);
        if (!result.ok) console.log(JSON.stringify(result.output.data || result.output.text || result.output, null, 2));
      } catch (error) {
        console.log(\`[FAIL] \${item.name}: \${error.message}\`);
      }
    }
  });
  await Promise.all(workers);
}

runConcurrent(SITES, CONCURRENCY, runSite).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`
}

export function useManagerState() {
  const preferredDark = usePreferredDark()
  const viewMode = getInitialViewMode()

  const themePreference = ref(THEME_SYSTEM)
  const resolvedTheme = computed(() => themePreference.value === THEME_SYSTEM
    ? (preferredDark.value ? THEME_DARK : THEME_LIGHT)
    : themePreference.value)

  const isPopup = ref(false)
  const activeTab = ref('endpoints')
  const isEditMode = ref(false)

  const endpoints = ref([])
  const checkinSites = ref([])
  const endpointCategories = ref([])
  const checkinCategories = ref([])

  const endpointCategoryFilter = ref(CATEGORY_ALL)
  const checkinCategoryFilter = ref(CATEGORY_ALL)
  const endpointEnabledFilter = ref(STATUS_FILTER_ENABLED)
  const checkinEnabledFilter = ref(STATUS_FILTER_ENABLED)

  const endpointCategoryInput = ref('')
  const checkinCategoryInput = ref('')
  const endpointFormCategoryInput = ref('')
  const checkinFormCategoryInput = ref('')

  const checkinConcurrency = ref(2)
  const batchChecking = ref(false)
  const checkingSiteIds = ref(new Set())
  const checkinProgressMap = ref({})
  const completedCheckinIds = ref(new Set())
  const batchProgress = ref(buildCheckinBatchProgress())
  const selectedCheckinSiteIds = ref([])
  const showFullOutput = ref(false)
  const endpointLayoutMode = ref(ENDPOINT_LAYOUT_CARD)
  const checkinLayoutMode = ref(CHECKIN_LAYOUT_CARD)
  const endpointCategoryManagerVisible = ref(false)
  const checkinCategoryManagerVisible = ref(false)

  const endpointDialogVisible = ref(false)
  const endpointDialogType = ref('add')
  const endpointForm = ref(defaultEndpointForm())
  const showEndpointApiKey = ref(false)

  const checkinDialogVisible = ref(false)
  const checkinDialogType = ref('add')
  const checkinForm = ref(defaultCheckinForm())
  const showCheckinApiKey = ref(false)

  const exportDialogVisible = ref(false)
  const schedulePreset = ref('daily_morning')
  const exportCron = ref('10 8 * * *')

  const remarkDialogVisible = ref(false)
  const currentRemark = ref('')

  const modelsDialogVisible = ref(false)
  const modelsList = ref([])
  const loadingModels = ref(false)
  const currentTestEndpoint = ref(null)
  const modelTestDialogVisible = ref(false)
  const modelTestResult = ref(null)
  const testingModelIds = ref(new Set())

  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

  const toasts = ref([])
  const toastTimers = new Map()
  const checkinProgressTimers = new Map()
  const checkinProgressHideTimers = new Map()
  const checkinCompletionTimers = new Map()
  let batchProgressHideTimer = null
  let popupBrowsingStateSaveTimer = null
  let popupBrowsingStateRestoring = false
  let toastSeed = 0

  const buildConfirmState = () => ({
    visible: false,
    title: '',
    message: '',
    tone: 'danger',
    confirmText: '确认',
    cancelText: '取消',
    resolve: null
  })

  const confirmDialog = ref(buildConfirmState())

  const pushToast = (tone, message, title = '') => {
    const id = `${Date.now()}-${toastSeed += 1}`
    toasts.value = [
      ...toasts.value,
      {
        id,
        tone,
        title: title || {
          success: '操作完成',
          error: '操作失败',
          warning: '请注意',
          info: '提示'
        }[tone],
        message
      }
    ]

    const timer = window.setTimeout(() => {
      dismissToast(id)
    }, 3200)
    toastTimers.set(id, timer)
  }

  const dismissToast = (id) => {
    const timer = toastTimers.get(id)
    if (timer) {
      window.clearTimeout(timer)
      toastTimers.delete(id)
    }
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  const notify = {
    success: (message, title) => pushToast('success', message, title),
    error: (message, title) => pushToast('error', message, title),
    warning: (message, title) => pushToast('warning', message, title),
    info: (message, title) => pushToast('info', message, title)
  }

  const requestConfirm = (options) => new Promise((resolve) => {
    confirmDialog.value = {
      ...buildConfirmState(),
      ...options,
      visible: true,
      resolve
    }
  })

  const settleConfirm = (accepted) => {
    const resolver = confirmDialog.value.resolve
    confirmDialog.value = buildConfirmState()
    if (resolver) resolver(accepted)
  }

  const displayCategories = (item) => {
    const categories = normalizeCategories(item.categories, item.category)
    return categories.length ? categories : ['未分类']
  }

  const syncViewportMode = () => {
    isPopup.value = viewMode === VIEW_MODE_POPUP
  }

  const clearPopupBrowsingStateSaveTimer = () => {
    if (!popupBrowsingStateSaveTimer) return
    window.clearTimeout(popupBrowsingStateSaveTimer)
    popupBrowsingStateSaveTimer = null
  }

  const getPopupScrollTop = () => Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0
  )

  const buildPopupBrowsingState = () => ({
    activeTab: normalizeActiveTab(activeTab.value),
    savedAt: Date.now(),
    scrollTop: getPopupScrollTop()
  })

  const persistPopupBrowsingState = () => {
    if (!isPopup.value || popupBrowsingStateRestoring) return
    writePopupBrowsingState(buildPopupBrowsingState())
  }

  const schedulePopupBrowsingStateSave = () => {
    if (!isPopup.value || popupBrowsingStateRestoring) return

    clearPopupBrowsingStateSaveTimer()
    popupBrowsingStateSaveTimer = window.setTimeout(() => {
      popupBrowsingStateSaveTimer = null
      persistPopupBrowsingState()
    }, POPUP_SCROLL_SAVE_DELAY_MS)
  }

  const restorePopupBrowsingState = async () => {
    if (!isPopup.value) return

    const savedState = readPopupBrowsingState()
    if (!savedState) return

    if (!savedState.savedAt || Date.now() - savedState.savedAt > POPUP_BROWSING_MAX_AGE_MS) {
      writePopupBrowsingState(null)
      return
    }

    popupBrowsingStateRestoring = true
    activeTab.value = savedState.activeTab
    await nextTick()

    await new Promise((resolve) => {
      const applyScroll = () => window.scrollTo({ top: savedState.scrollTop, behavior: 'auto' })
      window.requestAnimationFrame(() => {
        applyScroll()
        window.requestAnimationFrame(() => {
          applyScroll()
          popupBrowsingStateRestoring = false
          persistPopupBrowsingState()
          resolve()
        })
      })
    })
  }

  const applyThemeToDocument = () => {
    document.documentElement.dataset.theme = resolvedTheme.value
    document.documentElement.dataset.themePreference = themePreference.value
    document.body.classList.toggle('theme-dark', resolvedTheme.value === THEME_DARK)
  }

  const saveAppSettings = async () => {
    checkinConcurrency.value = normalizeConcurrency(checkinConcurrency.value)
    endpointLayoutMode.value = normalizeEndpointLayout(endpointLayoutMode.value)
    checkinLayoutMode.value = normalizeCheckinLayout(checkinLayoutMode.value)
    await storageSet({
      [APP_SETTINGS_KEY]: {
        checkinConcurrency: checkinConcurrency.value,
        themePreference: themePreference.value,
        endpointLayoutMode: endpointLayoutMode.value,
        checkinLayoutMode: checkinLayoutMode.value
      }
    })
  }

  const ensureCategory = async (scope, category) => {
    const normalized = normalizeCategory(category)
    if (!normalized) return

    const listRef = scope === 'endpoint' ? endpointCategories : checkinCategories
    if (listRef.value.includes(normalized)) return

    listRef.value = mergeCategories(listRef.value, [normalized])
    if (scope === 'endpoint') {
      await storageSet({ [ENDPOINT_CATEGORIES_KEY]: clone(listRef.value) })
    } else {
      await storageSet({ [CHECKIN_CATEGORIES_KEY]: clone(listRef.value) })
    }
  }

  const ensureCategories = async (scope, categories) => {
    const normalized = normalizeCategories(categories)
    if (!normalized.length) return

    const listRef = scope === 'endpoint' ? endpointCategories : checkinCategories
    const next = mergeCategories(listRef.value, normalized)
    if (next.length === listRef.value.length) return

    listRef.value = next
    if (scope === 'endpoint') {
      await storageSet({ [ENDPOINT_CATEGORIES_KEY]: clone(next) })
    } else {
      await storageSet({ [CHECKIN_CATEGORIES_KEY]: clone(next) })
    }
  }

  const saveEndpoints = async () => {
    await storageSet({ [ENDPOINTS_KEY]: clone(endpoints.value || []) })
  }

  const saveCheckinSites = async () => {
    await storageSet({ [CHECKIN_SITES_KEY]: clone(checkinSites.value || []) })
  }

  const addCategory = async (scope) => {
    const inputRef = scope === 'endpoint' ? endpointCategoryInput : checkinCategoryInput
    const category = normalizeCategory(inputRef.value)

    if (!category) {
      notify.warning('分类名称不能为空')
      return
    }

    await ensureCategory(scope, category)
    inputRef.value = ''
    notify.success('分类已添加')
  }

  const removeCategory = async (scope, category) => {
    const confirmed = await requestConfirm({
      title: '删除分类',
      message: `删除分类「${category}」后，已归属该分类的项目会移除该标签。确认继续吗？`,
      tone: 'danger',
      confirmText: '删除分类'
    })

    if (!confirmed) return

    if (scope === 'endpoint') {
      endpointCategories.value = endpointCategories.value.filter((item) => item !== category)
      endpoints.value = endpoints.value.map((item) => removeCategoryFromItem(item, category))
      if (endpointCategoryFilter.value === category) endpointCategoryFilter.value = CATEGORY_ALL
      await Promise.all([
        storageSet({ [ENDPOINT_CATEGORIES_KEY]: clone(endpointCategories.value) }),
        saveEndpoints()
      ])
    } else {
      checkinCategories.value = checkinCategories.value.filter((item) => item !== category)
      checkinSites.value = checkinSites.value.map((item) => removeCategoryFromItem(item, category))
      if (checkinCategoryFilter.value === category) checkinCategoryFilter.value = CATEGORY_ALL
      await Promise.all([
        storageSet({ [CHECKIN_CATEGORIES_KEY]: clone(checkinCategories.value) }),
        saveCheckinSites()
      ])
    }

    notify.success('分类已删除')
  }

  const getFormByScope = (scope) => scope === 'endpoint' ? endpointForm : checkinForm
  const getFormCategoryInputByScope = (scope) => scope === 'endpoint' ? endpointFormCategoryInput : checkinFormCategoryInput

  const setFormCategories = (scope, categories) => {
    const formRef = getFormByScope(scope)
    const normalized = normalizeCategories(categories)
    formRef.value.categories = normalized
    formRef.value.category = normalized[0] || ''
  }

  const hasFormCategory = (scope, category) => {
    const formRef = getFormByScope(scope)
    return normalizeCategories(formRef.value.categories, formRef.value.category).includes(category)
  }

  const addFormCategory = async (scope) => {
    const inputRef = getFormCategoryInputByScope(scope)
    const category = normalizeCategory(inputRef.value)
    if (!category) return

    const formRef = getFormByScope(scope)
    setFormCategories(scope, mergeCategories(formRef.value.categories, [category]))
    await ensureCategory(scope, category)
    inputRef.value = ''
  }

  const toggleFormCategory = async (scope, category) => {
    const formRef = getFormByScope(scope)
    const current = normalizeCategories(formRef.value.categories, formRef.value.category)
    if (current.includes(category)) {
      setFormCategories(scope, current.filter((item) => item !== category))
      return
    }

    setFormCategories(scope, mergeCategories(current, [category]))
    await ensureCategory(scope, category)
  }

  const removeFormCategoryTag = (scope, category) => {
    const formRef = getFormByScope(scope)
    const current = normalizeCategories(formRef.value.categories, formRef.value.category)
    setFormCategories(scope, current.filter((item) => item !== category))
  }

  const writeClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text || '')
      return
    }

    const textarea = document.createElement('textarea')
    textarea.value = text || ''
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  const copyText = async (text, label) => {
    try {
      await writeClipboard(text || '')
      notify.success(`${label} 已复制到剪贴板`)
    } catch (error) {
      notify.error('复制失败')
    }
  }

  const copyBaseUrlVariant = (baseUrl, mode) => {
    if (mode === 'v1') copyText(`${processBaseUrl(baseUrl)}/v1`, 'BaseURL(/v1)')
    if (mode === 'completion') copyText(`${processBaseUrl(baseUrl)}/v1/chat/completions`, 'Completion 端点')
  }

  const openUrl = (url) => window.open(url, '_blank', 'noopener,noreferrer')

  const showFullRemark = (text) => {
    currentRemark.value = text
    remarkDialogVisible.value = true
  }

  const closeRemarkDialog = () => {
    remarkDialogVisible.value = false
    currentRemark.value = ''
  }

  const openEndpointDialog = (type, data = null) => {
    endpointDialogType.value = type
    endpointForm.value = type === 'edit' ? normalizeEndpoint(clone(data)) : defaultEndpointForm()
    endpointFormCategoryInput.value = ''
    showEndpointApiKey.value = false
    endpointDialogVisible.value = true
  }

  const closeEndpointDialog = async () => {
    endpointDialogVisible.value = false
    await storageSet({ [ENDPOINT_DRAFT_KEY]: { dialogVisible: false } })
  }

  const submitEndpointForm = async () => {
    if (!endpointForm.value.baseUrl) {
      notify.warning('BaseURL 为必填项')
      return
    }

    endpointForm.value.baseUrl = processBaseUrl(endpointForm.value.baseUrl)
    const endpointData = normalizeEndpoint({ ...endpointForm.value, id: String(endpointForm.value.id || Date.now()) })
    const next = [...endpoints.value]
    const index = next.findIndex((item) => String(item.id) === endpointData.id)
    if (index >= 0) next[index] = endpointData
    else next.push(endpointData)

    next.sort((a, b) => (b.weight || 0) - (a.weight || 0))
    endpoints.value = next
    await ensureCategories('endpoint', endpointData.categories)
    await saveEndpoints()
    await closeEndpointDialog()
    notify.success(endpointDialogType.value === 'add' ? '端点已添加' : '端点已更新')
  }

  const deleteEndpoint = async (endpoint) => {
    const confirmed = await requestConfirm({
      title: '删除端点',
      message: `确定删除「${endpoint.name || '未命名端点'}」吗？`,
      tone: 'danger',
      confirmText: '删除端点'
    })

    if (!confirmed) return

    endpoints.value = endpoints.value.filter((item) => item.id !== endpoint.id)
    await saveEndpoints()
    notify.success('端点已删除')
  }

  const fetchModels = async (endpoint) => {
    modelsDialogVisible.value = true
    loadingModels.value = true
    modelsList.value = []
    currentTestEndpoint.value = endpoint

    try {
      const headers = {}
      if (endpoint.apiKey) {
        headers.Authorization = endpoint.apiKey.startsWith('Bearer ') ? endpoint.apiKey : `Bearer ${endpoint.apiKey}`
      }

      const res = await fetch(`${processBaseUrl(endpoint.baseUrl)}/v1/models`, { headers })
      const data = await res.json()
      if (!data?.data) throw new Error('未获取到模型数据')

      modelsList.value = data.data
      notify.success(`成功获取 ${data.data.length} 个模型`)
    } catch (error) {
      notify.error(`获取模型失败: ${error.message}`)
    } finally {
      loadingModels.value = false
    }
  }

  const closeModelsDialog = () => {
    modelsDialogVisible.value = false
    loadingModels.value = false
  }

  const testModel = async (modelId) => {
    const endpoint = currentTestEndpoint.value
    if (!endpoint) {
      notify.warning('请先选择一个端点获取模型列表')
      return
    }

    const nextSet = new Set(testingModelIds.value)
    nextSet.add(modelId)
    testingModelIds.value = nextSet
    const startedAt = performance.now()

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (endpoint.apiKey) {
        headers.Authorization = endpoint.apiKey.startsWith('Bearer ') ? endpoint.apiKey : `Bearer ${endpoint.apiKey}`
      }

      const res = await fetch(`${processBaseUrl(endpoint.baseUrl)}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      })

      modelTestResult.value = {
        modelId,
        endpointName: endpoint.name,
        baseUrl: processBaseUrl(endpoint.baseUrl),
        ok: res.ok,
        status: res.status,
        elapsedMs: Math.round(performance.now() - startedAt),
        response: await parseModelTestResponse(res)
      }
    } catch (error) {
      modelTestResult.value = {
        modelId,
        endpointName: endpoint.name,
        baseUrl: processBaseUrl(endpoint.baseUrl),
        ok: false,
        status: '',
        elapsedMs: Math.round(performance.now() - startedAt),
        error: error.message,
        response: { error: error.message }
      }
    } finally {
      const finalSet = new Set(testingModelIds.value)
      finalSet.delete(modelId)
      testingModelIds.value = finalSet
      modelTestDialogVisible.value = true
    }
  }

  const closeModelTestDialog = () => {
    modelTestDialogVisible.value = false
  }

  const openCheckinDialog = (type, site = null) => {
    checkinDialogType.value = type
    checkinForm.value = site ? normalizeCheckinSite(clone(site)) : defaultCheckinForm()
    checkinFormCategoryInput.value = ''
    showCheckinApiKey.value = false
    checkinDialogVisible.value = true
  }

  const closeCheckinDialog = async () => {
    checkinDialogVisible.value = false
    await storageSet({ [CHECKIN_DRAFT_KEY]: { dialogVisible: false } })
  }

  const parseRequestCommandAction = () => {
    const commandText = checkinForm.value.request.commandText || ''
    if (!commandText.trim()) {
      notify.warning('请先粘贴完整的 curl 请求命令')
      return
    }

    try {
      checkinForm.value.request = {
        ...checkinForm.value.request,
        ...parseCurlCommand(commandText)
      }
      notify.success('请求解析成功，已回填到下方字段')
    } catch (error) {
      notify.error(error.message || '请求解析失败')
    }
  }

  const submitCheckinForm = async () => {
    if (
      checkinForm.value.platform === 'custom' &&
      checkinForm.value.request.inputMode === 'command' &&
      checkinForm.value.request.commandText.trim()
    ) {
      try {
        checkinForm.value.request = {
          ...checkinForm.value.request,
          ...parseCurlCommand(checkinForm.value.request.commandText)
        }
      } catch (error) {
        notify.error(error.message || '请求解析失败')
        return
      }
    }

    const data = normalizeCheckinSite(checkinForm.value)
    if (!data.name.trim()) {
      notify.warning('站点名称为必填项')
      return
    }

    if (data.platform === 'new-api') {
      if (!data.baseUrl || !data.apiKey) {
        notify.warning('New-API 模式需要填写 BaseURL 和 APIKEY')
        return
      }
      data.baseUrl = processBaseUrl(data.baseUrl)
    } else if (!data.request.url) {
      notify.warning('手动 HTTP 模式需要填写请求地址')
      return
    }

    const siteData = { ...data, id: String(data.id || Date.now()) }
    const next = [...checkinSites.value]
    const index = next.findIndex((item) => item.id === siteData.id)
    if (index >= 0) next[index] = siteData
    else next.push(siteData)

    checkinSites.value = next
    await ensureCategories('checkin', siteData.categories)
    await saveCheckinSites()
    await closeCheckinDialog()
    notify.success(checkinDialogType.value === 'add' ? '签到站点已添加' : '签到站点已更新')
  }

  const deleteCheckinSite = async (site) => {
    const confirmed = await requestConfirm({
      title: '删除签到站点',
      message: `确定删除「${site.name || '未命名站点'}」吗？`,
      tone: 'danger',
      confirmText: '删除站点'
    })

    if (!confirmed) return

    checkinSites.value = checkinSites.value.filter((item) => item.id !== site.id)
    await saveCheckinSites()
    notify.success('签到站点已删除')
  }

  const runCheckinRequest = async (site) => {
    if (site.enabled === false) throw new Error('站点已停用')

    if (site.platform === 'new-api') {
      const res = await requestWithTimeout(`${processBaseUrl(site.baseUrl)}/api/user/checkin`, {
        method: 'POST',
        headers: newApiHeaders(site)
      })
      const response = await parseFetchResponse(res)
      const text = response.text || JSON.stringify(response.data || {})
      const alreadyChecked = /已签到|already/i.test(text)
      const businessOk = response.data && response.data.success !== false
      const ok = response.ok && (businessOk || alreadyChecked || !response.data)
      return {
        ok,
        response,
        summary: summarizeNewApiResponse(response, ok, alreadyChecked)
      }
    }

    const headers = parseHeaders(site.request.headersText)
    const method = (site.request.method || 'GET').toUpperCase()
    const options = { method, headers }
    if (!['GET', 'HEAD'].includes(method) && site.request.bodyText.trim()) {
      options.body = site.request.bodyText
    }

    const res = await requestWithTimeout(site.request.url, options)
    const response = await parseFetchResponse(res)
    const text = response.text || JSON.stringify(response.data || {})
    const successKeywords = splitKeywords(site.request.successKeywords)
    const failureKeywords = splitKeywords(site.request.failureKeywords)
    const hasFailureKeyword = failureKeywords.some((keyword) => text.includes(keyword))
    const hasSuccessKeyword = successKeywords.length > 0 && successKeywords.some((keyword) => text.includes(keyword))
    const ok = res.ok && !hasFailureKeyword && (successKeywords.length === 0 || hasSuccessKeyword)

    return {
      ok,
      response,
      summary: summarizeCustomCheckinResponse(response, ok, hasFailureKeyword)
    }
  }

  const applyCheckinResult = (siteId, result) => {
    const index = checkinSites.value.findIndex((item) => item.id === siteId)
    if (index < 0) return

    const next = [...checkinSites.value]
    next[index] = {
      ...next[index],
      lastStatus: result.ok ? 'success' : 'failed',
      lastSummary: result.summary,
      lastResponse: result.response,
      lastRunAt: new Date().toISOString()
    }
    checkinSites.value = next
  }

  const markCheckinRunning = (siteId) => {
    const index = checkinSites.value.findIndex((item) => item.id === siteId)
    if (index < 0) return

    const next = [...checkinSites.value]
    next[index] = {
      ...next[index],
      lastStatus: 'running',
      lastSummary: '正在执行签到请求...'
    }
    checkinSites.value = next
  }

  const setCheckinProgress = (siteId, payload) => {
    checkinProgressMap.value = {
      ...checkinProgressMap.value,
      [siteId]: {
        ...(checkinProgressMap.value[siteId] || {}),
        ...payload
      }
    }
  }

  const clearCheckinProgressTimer = (siteId) => {
    const timer = checkinProgressTimers.get(siteId)
    if (timer) {
      window.clearInterval(timer)
      checkinProgressTimers.delete(siteId)
    }
  }

  const clearCheckinProgressHideTimer = (siteId) => {
    const timer = checkinProgressHideTimers.get(siteId)
    if (timer) {
      window.clearTimeout(timer)
      checkinProgressHideTimers.delete(siteId)
    }
  }

  const clearCheckinCompletionTimer = (siteId) => {
    const timer = checkinCompletionTimers.get(siteId)
    if (timer) {
      window.clearTimeout(timer)
      checkinCompletionTimers.delete(siteId)
    }
  }

  const removeCheckinProgress = (siteId) => {
    clearCheckinProgressTimer(siteId)
    clearCheckinProgressHideTimer(siteId)
    const next = { ...checkinProgressMap.value }
    delete next[siteId]
    checkinProgressMap.value = next
  }

  const triggerCheckinCompletion = (siteId) => {
    clearCheckinCompletionTimer(siteId)
    const next = new Set(completedCheckinIds.value)
    next.add(siteId)
    completedCheckinIds.value = next

    const timer = window.setTimeout(() => {
      const current = new Set(completedCheckinIds.value)
      current.delete(siteId)
      completedCheckinIds.value = current
      checkinCompletionTimers.delete(siteId)
    }, 1400)

    checkinCompletionTimers.set(siteId, timer)
  }

  const startCheckinProgress = (site, mode = 'single') => {
    clearCheckinProgressTimer(site.id)
    clearCheckinProgressHideTimer(site.id)
    clearCheckinCompletionTimer(site.id)
    const nextCompleted = new Set(completedCheckinIds.value)
    nextCompleted.delete(site.id)
    completedCheckinIds.value = nextCompleted
    setCheckinProgress(site.id, {
      mode,
      running: true,
      ok: null,
      percent: 12,
      label: '准备请求'
    })

    const timer = window.setInterval(() => {
      const current = checkinProgressMap.value[site.id]
      if (!current?.running) {
        clearCheckinProgressTimer(site.id)
        return
      }

      const nextPercent = current.percent < 36
        ? current.percent + 12
        : current.percent < 68
          ? current.percent + 8
          : current.percent + 3

      const percent = Math.min(88, nextPercent)
      const label = percent < 36
        ? '校验配置'
        : percent < 68
          ? '发送请求'
          : '等待响应'

      setCheckinProgress(site.id, { percent, label })
      if (percent >= 88) clearCheckinProgressTimer(site.id)
    }, 220)

    checkinProgressTimers.set(site.id, timer)
  }

  const finishCheckinProgress = (siteId, ok) => {
    clearCheckinProgressTimer(siteId)
    clearCheckinProgressHideTimer(siteId)
    setCheckinProgress(siteId, {
      running: false,
      ok,
      percent: 100,
      label: ok ? '签到完成' : '执行结束'
    })
    triggerCheckinCompletion(siteId)

    const timer = window.setTimeout(() => {
      removeCheckinProgress(siteId)
    }, 2200)

    checkinProgressHideTimers.set(siteId, timer)
  }

  const resetBatchProgress = () => {
    if (batchProgressHideTimer) {
      window.clearTimeout(batchProgressHideTimer)
      batchProgressHideTimer = null
    }
    batchProgress.value = buildCheckinBatchProgress()
  }

  const startBatchProgress = (sites, mode, label) => {
    if (batchProgressHideTimer) {
      window.clearTimeout(batchProgressHideTimer)
      batchProgressHideTimer = null
    }

    batchProgress.value = {
      visible: true,
      mode,
      label,
      total: sites.length,
      completed: 0,
      success: 0,
      failed: 0,
      percent: 0,
      currentSiteName: sites[0]?.name || '未命名站点',
      finished: false
    }
  }

  const stepBatchProgress = (site, result) => {
    const current = batchProgress.value
    const completed = Math.min(current.total, current.completed + 1)
    const success = current.success + (result.ok ? 1 : 0)
    const failed = current.failed + (result.ok ? 0 : 1)

    batchProgress.value = {
      ...current,
      completed,
      success,
      failed,
      percent: current.total ? Math.round((completed / current.total) * 100) : 0,
      currentSiteName: site.name || '未命名站点'
    }
  }

  const finishBatchProgress = () => {
    batchProgress.value = {
      ...batchProgress.value,
      visible: true,
      finished: true,
      percent: batchProgress.value.total ? 100 : 0,
      currentSiteName: batchProgress.value.failed
        ? `本轮完成，失败 ${batchProgress.value.failed} 个`
        : '本轮全部完成'
    }

    batchProgressHideTimer = window.setTimeout(() => {
      resetBatchProgress()
    }, 2600)
  }

  const runSingleCheckin = async (site, options = {}) => {
    if (!site?.id) return null
    if (checkingSiteIds.value.has(site.id)) return null

    const nextSet = new Set(checkingSiteIds.value)
    nextSet.add(site.id)
    checkingSiteIds.value = nextSet
    startCheckinProgress(site, options.mode || 'single')
    markCheckinRunning(site.id)

    try {
      const result = await runCheckinRequest(site)
      applyCheckinResult(site.id, result)
      finishCheckinProgress(site.id, result.ok)
      await saveCheckinSites()
      if (result.ok) notify.success(`${site.name} 签到成功`)
      else notify.error(`${site.name} 签到失败`)
      return result
    } catch (error) {
      const result = {
        ok: false,
        summary: error.name === 'AbortError' ? '请求超时' : error.message,
        response: { error: error.name === 'AbortError' ? '请求超时' : error.message }
      }
      applyCheckinResult(site.id, result)
      finishCheckinProgress(site.id, false)
      await saveCheckinSites()
      notify.error(`${site.name} 签到失败: ${result.summary}`)
      return result
    } finally {
      const finalSet = new Set(checkingSiteIds.value)
      finalSet.delete(site.id)
      checkingSiteIds.value = finalSet
    }
  }

  const runConcurrent = async (items, limit, task) => {
    const queue = [...items]
    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift()
        await task(item)
      }
    })
    await Promise.all(workers)
  }

  const runBatchCheckins = async (sites) => {
    if (!sites.length) {
      notify.warning('没有可执行的签到站点')
      return
    }

    batchChecking.value = true
    try {
      await runConcurrent(sites, checkinConcurrency.value || 2, async (site) => {
        batchProgress.value = {
          ...batchProgress.value,
          currentSiteName: site.name || '未命名站点'
        }
        const result = await runSingleCheckin(site, { mode: 'batch' })
        if (result) stepBatchProgress(site, result)
        return result
      })
      finishBatchProgress()
      const failed = batchProgress.value.failed
      if (failed) notify.warning(`批量签到完成，仍有 ${failed} 个失败站点`)
      else notify.success('批量签到完成')
    } finally {
      batchChecking.value = false
    }
  }

  const runAllCheckins = () => {
    const selectedSites = selectedCheckinSites.value.filter((site) => site.enabled !== false)
    const runnableSites = selectedSites.length
      ? selectedSites
      : checkinSites.value.filter((site) => site.enabled !== false)
    if (!runnableSites.length) {
      notify.warning('没有可执行的签到站点')
      return
    }
    startBatchProgress(runnableSites, selectedSites.length ? 'selected' : 'all', selectedSites.length ? '多选签到' : '一键签到')
    return runBatchCheckins(runnableSites)
  }
  const retryFailedCheckins = () => {
    const runnableSites = checkinSites.value.filter((site) => site.enabled !== false && site.lastStatus === 'failed')
    if (!runnableSites.length) {
      notify.warning('没有可重试的失败站点')
      return
    }
    startBatchProgress(runnableSites, 'retry', '失败重试')
    return runBatchCheckins(runnableSites)
  }

  const statusLabel = (status) => {
    if (status === 'success') return '成功'
    if (status === 'failed') return '失败'
    if (status === 'running') return '运行中'
    return '未执行'
  }

  const statusTone = (status) => {
    if (status === 'success') return 'success'
    if (status === 'failed') return 'danger'
    if (status === 'running') return 'warning'
    return 'neutral'
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleString()
  }

  const formatOutput = (value) => {
    if (!value) return ''
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    } catch (error) {
      return String(value)
    }
  }

  const toggleCheckinSelection = (siteId, selected) => {
    const next = new Set(selectedCheckinSiteIds.value)
    if (selected) next.add(siteId)
    else next.delete(siteId)
    selectedCheckinSiteIds.value = Array.from(next)
  }

  const toggleAllFilteredCheckins = (selected) => {
    if (!selected) {
      selectedCheckinSiteIds.value = selectedCheckinSiteIds.value.filter(
        (id) => !filteredCheckinSites.value.some((site) => site.id === id)
      )
      return
    }

    const next = new Set(selectedCheckinSiteIds.value)
    filteredCheckinSites.value.forEach((site) => next.add(site.id))
    selectedCheckinSiteIds.value = Array.from(next)
  }

  const openExportDialog = () => {
    if (!selectedCheckinSites.value.length) {
      notify.warning('请先选择需要导出的站点')
      return
    }

    applySchedulePreset()
    exportDialogVisible.value = true
  }

  const closeExportDialog = () => {
    exportDialogVisible.value = false
  }

  const openEndpointCategoryManager = () => {
    endpointCategoryManagerVisible.value = true
  }

  const closeEndpointCategoryManager = () => {
    endpointCategoryManagerVisible.value = false
    endpointCategoryInput.value = ''
  }

  const openCheckinCategoryManager = () => {
    checkinCategoryManagerVisible.value = true
  }

  const closeCheckinCategoryManager = () => {
    checkinCategoryManagerVisible.value = false
    checkinCategoryInput.value = ''
  }

  const schedulePresetOptions = [
    { label: '每天 08:10', value: 'daily_morning' },
    { label: '每天 12:10', value: 'daily_noon' },
    { label: '每 8 小时', value: 'every_8h' },
    { label: '每周一 08:10', value: 'weekly_monday' },
    { label: '自定义 Cron', value: 'custom' }
  ]

  const applySchedulePreset = () => {
    const presets = {
      daily_morning: '10 8 * * *',
      daily_noon: '10 12 * * *',
      every_8h: '10 */8 * * *',
      weekly_monday: '10 8 * * 1'
    }
    if (schedulePreset.value !== 'custom') exportCron.value = presets[schedulePreset.value]
  }

  const exportData = () => {
    const payload = {
      endpoints: clone(endpoints.value || []),
      checkinSites: clone(checkinSites.value || []),
      endpointCategories: clone(endpointCategories.value || []),
      checkinCategories: clone(checkinCategories.value || []),
      appSettings: {
        checkinConcurrency: normalizeConcurrency(checkinConcurrency.value),
        themePreference: themePreference.value,
        endpointLayoutMode: normalizeEndpointLayout(endpointLayoutMode.value),
        checkinLayoutMode: normalizeCheckinLayout(checkinLayoutMode.value)
      }
    }

    const dataStr = JSON.stringify(payload, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ai-endpoints-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify.success('数据导出成功')
  }

  const importData = (file) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (Array.isArray(data)) {
          endpoints.value = data.map(normalizeEndpoint)
          endpointCategories.value = mergeCategories(
            endpointCategories.value,
            endpoints.value.flatMap((item) => normalizeCategories(item.categories, item.category))
          )
          await Promise.all([
            saveEndpoints(),
            storageSet({ [ENDPOINT_CATEGORIES_KEY]: clone(endpointCategories.value) })
          ])
        } else if (data && typeof data === 'object') {
          endpoints.value = Array.isArray(data.endpoints) ? data.endpoints.map(normalizeEndpoint) : []
          checkinSites.value = Array.isArray(data.checkinSites) ? data.checkinSites.map(normalizeCheckinSite) : []
          endpointCategories.value = mergeCategories(
            data.endpointCategories || [],
            endpoints.value.flatMap((item) => normalizeCategories(item.categories, item.category))
          )
          checkinCategories.value = mergeCategories(
            data.checkinCategories || [],
            checkinSites.value.flatMap((item) => normalizeCategories(item.categories, item.category))
          )
          checkinConcurrency.value = normalizeConcurrency(data.appSettings?.checkinConcurrency)
          themePreference.value = normalizeThemePreference(data.appSettings?.themePreference)
          endpointLayoutMode.value = normalizeEndpointLayout(data.appSettings?.endpointLayoutMode)
          checkinLayoutMode.value = normalizeCheckinLayout(data.appSettings?.checkinLayoutMode)
          await Promise.all([
            saveEndpoints(),
            saveCheckinSites(),
            storageSet({ [ENDPOINT_CATEGORIES_KEY]: clone(endpointCategories.value) }),
            storageSet({ [CHECKIN_CATEGORIES_KEY]: clone(checkinCategories.value) }),
            saveAppSettings()
          ])
        } else {
          throw new Error('格式错误')
        }
        notify.success('数据恢复成功')
      } catch (error) {
        notify.error('导入失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
  }

  const clearData = async () => {
    const confirmed = await requestConfirm({
      title: '清空本地数据',
      message: '这会删除端点、签到站点、分类和草稿数据，且无法撤销。确认继续吗？',
      tone: 'danger',
      confirmText: '清空数据'
    })

    if (!confirmed) return

    endpoints.value = []
    checkinSites.value = []
    endpointCategories.value = []
    checkinCategories.value = []
    selectedCheckinSiteIds.value = []
    checkinConcurrency.value = 2
    endpointLayoutMode.value = ENDPOINT_LAYOUT_CARD
    checkinLayoutMode.value = CHECKIN_LAYOUT_CARD
    endpointCategoryManagerVisible.value = false
    checkinCategoryManagerVisible.value = false
    checkinProgressTimers.forEach((timer) => window.clearInterval(timer))
    checkinProgressHideTimers.forEach((timer) => window.clearTimeout(timer))
    checkinCompletionTimers.forEach((timer) => window.clearTimeout(timer))
    checkinProgressTimers.clear()
    checkinProgressHideTimers.clear()
    checkinCompletionTimers.clear()
    checkinProgressMap.value = {}
    completedCheckinIds.value = new Set()
    resetBatchProgress()

    await storageRemove([
      ENDPOINTS_KEY,
      CHECKIN_SITES_KEY,
      ENDPOINT_CATEGORIES_KEY,
      CHECKIN_CATEGORIES_KEY,
      ENDPOINT_DRAFT_KEY,
      CHECKIN_DRAFT_KEY,
      APP_SETTINGS_KEY
    ])
    notify.success('数据已清空')
  }

  const buildViewModeUrl = (mode) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome.runtime.getURL(`index.html?mode=${mode}`)
    }

    const url = new URL(window.location.href)
    url.searchParams.set('mode', mode)
    return url.toString()
  }

  const openStandaloneMode = () => {
    const url = buildViewModeUrl(VIEW_MODE_STANDALONE)

    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.create({ url, state: 'maximized' })
      return
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url })
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const openPopupMode = () => {
    const url = buildViewModeUrl(VIEW_MODE_POPUP)

    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.create({
        url,
        type: 'popup',
        width: 600,
        height: 760
      })
      return
    }

    window.open(url, 'ai-endpoint-manager-popup', 'popup=yes,width=640,height=800')
  }

  const toggleViewMode = () => {
    if (isPopup.value) {
      openStandaloneMode()
      return
    }

    openPopupMode()
  }

  const decrementConcurrency = async () => {
    checkinConcurrency.value = normalizeConcurrency(checkinConcurrency.value - 1)
    await saveAppSettings()
  }

  const incrementConcurrency = async () => {
    checkinConcurrency.value = normalizeConcurrency(checkinConcurrency.value + 1)
    await saveAppSettings()
  }

  const endpointCategoryOptions = computed(() => mergeCategories(
    endpointCategories.value,
    endpoints.value.flatMap((item) => normalizeCategories(item.categories, item.category))
  ))

  const checkinCategoryOptions = computed(() => mergeCategories(
    checkinCategories.value,
    checkinSites.value.flatMap((item) => normalizeCategories(item.categories, item.category))
  ))

  const headerMeta = computed(() => {
    if (activeTab.value === 'endpoints') {
      return {
        eyebrow: 'API GATEWAY DIRECTORY',
        title: '端点管理',
        description: '集中维护 BaseURL、密钥、启用状态与模型连通性。'
      }
    }

    if (activeTab.value === 'checkin') {
      return {
        eyebrow: 'CHECK-IN AUTOMATION',
        title: 'API 中转站一键签到',
        description: '支持 New-API 预置逻辑和自定义 HTTP 请求，默认并发 2。'
      }
    }

    return {
      eyebrow: 'LOCAL DATA',
      title: '系统设置',
      description: '导入、导出或清空本地端点与签到站点数据。'
    }
  })

  const keyedEndpointCount = computed(() => endpoints.value.filter((item) => item.apiKey).length)
  const activeEndpointCount = computed(() => endpoints.value.filter((item) => item.enabled !== false).length)
  const failedCheckinCount = computed(() => checkinSites.value.filter((item) => item.lastStatus === 'failed').length)
  const hasFailedCheckins = computed(() => failedCheckinCount.value > 0)

  const displayedEndpoints = computed({
    get: () => endpoints.value.filter((item) => matchesCategory(item, endpointCategoryFilter.value) && matchesEnabled(item, endpointEnabledFilter.value)),
    set: (value) => {
      if (endpointCategoryFilter.value === CATEGORY_ALL && endpointEnabledFilter.value === STATUS_FILTER_ALL) {
        endpoints.value = value
        return
      }

      const reordered = Array.isArray(value) ? [...value] : []
      endpoints.value = endpoints.value.map((item) => {
        if (!matchesCategory(item, endpointCategoryFilter.value) || !matchesEnabled(item, endpointEnabledFilter.value)) {
          return item
        }

        return reordered.shift() || item
      })
    }
  })

  const filteredCheckinSites = computed(() => checkinSites.value.filter(
    (item) => matchesCategory(item, checkinCategoryFilter.value) && matchesEnabled(item, checkinEnabledFilter.value)
  ))

  const selectedCheckinSites = computed(() => checkinSites.value.filter((site) => selectedCheckinSiteIds.value.includes(site.id)))
  const allFilteredCheckinsSelected = computed(() => (
    filteredCheckinSites.value.length > 0 &&
    filteredCheckinSites.value.every((site) => selectedCheckinSiteIds.value.includes(site.id))
  ))
  const batchProgressVisible = computed(() => batchProgress.value.visible)

  const exportMetaText = computed(() => [
    `Cron: ${exportCron.value}`,
    '青龙任务命令: task api-endpoint-checkin.js',
    '说明: 脚本代码不包含 Cron，请在青龙定时任务中单独填写上面的 Cron。'
  ].join('\n'))

  const generatedQinglongScriptText = computed(() => generateQinglongScript(selectedCheckinSites.value, checkinConcurrency.value))

  const anyOverlayOpen = computed(() => (
    endpointDialogVisible.value ||
    endpointCategoryManagerVisible.value ||
    checkinDialogVisible.value ||
    exportDialogVisible.value ||
    checkinCategoryManagerVisible.value ||
    remarkDialogVisible.value ||
    modelsDialogVisible.value ||
    modelTestDialogVisible.value ||
    confirmDialog.value.visible
  ))

  watch(resolvedTheme, applyThemeToDocument, { immediate: true })

  watch(themePreference, async () => {
    try {
      await saveAppSettings()
    } catch (error) {
      console.error('保存主题设置失败:', error)
    }
  })

  watch(endpointLayoutMode, async () => {
    try {
      await saveAppSettings()
    } catch (error) {
      console.error('保存端点布局失败:', error)
    }
  })

  watch(checkinLayoutMode, async () => {
    try {
      await saveAppSettings()
    } catch (error) {
      console.error('保存签到布局失败:', error)
    }
  })

  watch(anyOverlayOpen, (value) => {
    document.body.classList.toggle('modal-open', value)
  }, { immediate: true })

  watch([endpointForm, endpointDialogVisible, endpointDialogType], async () => {
    try {
      await storageSet({
        [ENDPOINT_DRAFT_KEY]: {
          form: endpointForm.value,
          dialogVisible: endpointDialogVisible.value,
          dialogType: endpointDialogType.value
        }
      })
    } catch (error) {
      console.error('保存端点草稿失败:', error)
    }
  }, { deep: true })

  watch([checkinForm, checkinDialogVisible, checkinDialogType], async () => {
    try {
      await storageSet({
        [CHECKIN_DRAFT_KEY]: {
          form: checkinForm.value,
          dialogVisible: checkinDialogVisible.value,
          dialogType: checkinDialogType.value
        }
      })
    } catch (error) {
      console.error('保存签到草稿失败:', error)
    }
  }, { deep: true })

  watch(checkinSites, () => {
    const validIds = new Set(checkinSites.value.map((item) => item.id))
    selectedCheckinSiteIds.value = selectedCheckinSiteIds.value.filter((id) => validIds.has(id))
  }, { deep: true })

  watch(activeTab, () => {
    persistPopupBrowsingState()
  })

  onMounted(async () => {
    syncViewportMode()

    const result = await storageGet([
      ENDPOINTS_KEY,
      CHECKIN_SITES_KEY,
      ENDPOINT_CATEGORIES_KEY,
      CHECKIN_CATEGORIES_KEY,
      ENDPOINT_DRAFT_KEY,
      CHECKIN_DRAFT_KEY,
      APP_SETTINGS_KEY
    ])

    endpoints.value = Array.isArray(result[ENDPOINTS_KEY]) ? result[ENDPOINTS_KEY].map(normalizeEndpoint) : []
    checkinSites.value = Array.isArray(result[CHECKIN_SITES_KEY]) ? result[CHECKIN_SITES_KEY].map(normalizeCheckinSite) : []
    endpointCategories.value = mergeCategories(
      result[ENDPOINT_CATEGORIES_KEY] || [],
      endpoints.value.flatMap((item) => normalizeCategories(item.categories, item.category))
    )
    checkinCategories.value = mergeCategories(
      result[CHECKIN_CATEGORIES_KEY] || [],
      checkinSites.value.flatMap((item) => normalizeCategories(item.categories, item.category))
    )

    checkinConcurrency.value = normalizeConcurrency(result[APP_SETTINGS_KEY]?.checkinConcurrency)
    themePreference.value = normalizeThemePreference(result[APP_SETTINGS_KEY]?.themePreference)
    endpointLayoutMode.value = normalizeEndpointLayout(result[APP_SETTINGS_KEY]?.endpointLayoutMode)
    checkinLayoutMode.value = normalizeCheckinLayout(result[APP_SETTINGS_KEY]?.checkinLayoutMode)

    const endpointDraft = result[ENDPOINT_DRAFT_KEY]
    if (endpointDraft?.dialogVisible) {
      endpointForm.value = normalizeEndpoint(endpointDraft.form || defaultEndpointForm())
      endpointDialogType.value = endpointDraft.dialogType || 'add'
      endpointDialogVisible.value = true
    }

    const checkinDraft = result[CHECKIN_DRAFT_KEY]
    if (checkinDraft?.dialogVisible) {
      activeTab.value = 'checkin'
      checkinForm.value = normalizeCheckinSite(checkinDraft.form || defaultCheckinForm())
      checkinDialogType.value = checkinDraft.dialogType || 'add'
      checkinDialogVisible.value = true
    }

    if (isPopup.value) {
      window.addEventListener('scroll', schedulePopupBrowsingStateSave, { passive: true })
      window.addEventListener('pagehide', persistPopupBrowsingState)
      document.addEventListener('visibilitychange', persistPopupBrowsingState)
      await restorePopupBrowsingState()
    }
  })

  onBeforeUnmount(() => {
    toastTimers.forEach((timer) => window.clearTimeout(timer))
    checkinProgressTimers.forEach((timer) => window.clearInterval(timer))
    checkinProgressHideTimers.forEach((timer) => window.clearTimeout(timer))
    checkinCompletionTimers.forEach((timer) => window.clearTimeout(timer))
    if (batchProgressHideTimer) window.clearTimeout(batchProgressHideTimer)
    clearPopupBrowsingStateSaveTimer()
    persistPopupBrowsingState()
    window.removeEventListener('scroll', schedulePopupBrowsingStateSave)
    window.removeEventListener('pagehide', persistPopupBrowsingState)
    document.removeEventListener('visibilitychange', persistPopupBrowsingState)
  })

  return {
    CATEGORY_ALL,
    CATEGORY_NONE,
    STATUS_FILTER_ENABLED,
    STATUS_FILTER_DISABLED,
    STATUS_FILTER_ALL,
    THEME_LIGHT,
    THEME_DARK,
    THEME_SYSTEM,
    ENDPOINT_LAYOUT_LIST,
    ENDPOINT_LAYOUT_CARD,
    CHECKIN_LAYOUT_LIST,
    CHECKIN_LAYOUT_CARD,
    httpMethods,
    schedulePresetOptions,
    isPopup,
    activeTab,
    isEditMode,
    endpoints,
    checkinSites,
    endpointCategories,
    checkinCategories,
    endpointCategoryFilter,
    checkinCategoryFilter,
    endpointEnabledFilter,
    checkinEnabledFilter,
    endpointCategoryInput,
    checkinCategoryInput,
    endpointFormCategoryInput,
    checkinFormCategoryInput,
    checkinConcurrency,
    batchChecking,
    checkingSiteIds,
    checkinProgressMap,
    completedCheckinIds,
    batchProgress,
    selectedCheckinSiteIds,
    showFullOutput,
    endpointLayoutMode,
    checkinLayoutMode,
    endpointCategoryManagerVisible,
    checkinCategoryManagerVisible,
    endpointDialogVisible,
    endpointDialogType,
    endpointForm,
    showEndpointApiKey,
    checkinDialogVisible,
    checkinDialogType,
    checkinForm,
    showCheckinApiKey,
    exportDialogVisible,
    schedulePreset,
    exportCron,
    remarkDialogVisible,
    currentRemark,
    modelsDialogVisible,
    modelsList,
    loadingModels,
    currentTestEndpoint,
    modelTestDialogVisible,
    modelTestResult,
    testingModelIds,
    toasts,
    confirmDialog,
    themePreference,
    resolvedTheme,
    headerMeta,
    keyedEndpointCount,
    activeEndpointCount,
    failedCheckinCount,
    hasFailedCheckins,
    endpointCategoryOptions,
    checkinCategoryOptions,
    displayedEndpoints,
    filteredCheckinSites,
    selectedCheckinSites,
    allFilteredCheckinsSelected,
    batchProgressVisible,
    exportMetaText,
    generatedQinglongScriptText,
    anyOverlayOpen,
    maskSecret,
    truncateText,
    displayCategories,
    copyText,
    copyBaseUrlVariant,
    openUrl,
    showFullRemark,
    closeRemarkDialog,
    openEndpointDialog,
    closeEndpointDialog,
    submitEndpointForm,
    deleteEndpoint,
    setFormCategories,
    hasFormCategory,
    addFormCategory,
    toggleFormCategory,
    removeFormCategoryTag,
    addCategory,
    removeCategory,
    saveEndpoints,
    saveAppSettings,
    fetchModels,
    closeModelsDialog,
    testModel,
    closeModelTestDialog,
    openCheckinDialog,
    closeCheckinDialog,
    parseRequestCommandAction,
    submitCheckinForm,
    deleteCheckinSite,
    runSingleCheckin,
    runAllCheckins,
    retryFailedCheckins,
    statusLabel,
    statusTone,
    formatTime,
    formatOutput,
    toggleCheckinSelection,
    toggleAllFilteredCheckins,
    openExportDialog,
    closeExportDialog,
    openEndpointCategoryManager,
    closeEndpointCategoryManager,
    openCheckinCategoryManager,
    closeCheckinCategoryManager,
    applySchedulePreset,
    exportData,
    importData,
    clearData,
    openStandaloneMode,
    openPopupMode,
    toggleViewMode,
    dismissToast,
    settleConfirm,
    processBaseUrl,
    decrementConcurrency,
    incrementConcurrency
  }
}
