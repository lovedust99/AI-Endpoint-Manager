export const VIEW_MODE_POPUP = 'popup'
export const VIEW_MODE_STANDALONE = 'standalone'

const VIEW_MODE_QUERY_KEY = 'mode'

const normalizeViewMode = (value) => {
  if (value === VIEW_MODE_POPUP || value === VIEW_MODE_STANDALONE) return value
  return ''
}

export const getExplicitViewMode = () => {
  const query = new URLSearchParams(window.location.search).get(VIEW_MODE_QUERY_KEY)
  return normalizeViewMode(query)
}

export const getInitialViewMode = () => {
  const explicitMode = getExplicitViewMode()
  if (explicitMode) return explicitMode

  return window.location.protocol === 'chrome-extension:'
    ? VIEW_MODE_POPUP
    : VIEW_MODE_STANDALONE
}
