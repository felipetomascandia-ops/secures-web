export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://www.olimpocoveragegroup.com'
    }

    return origin
  }

  return 'https://www.olimpocoveragegroup.com'
}

export function getAuthRedirectUrl(path: string) {
  const baseUrl = getAppBaseUrl()
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
