export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  return 'https://www.olimpocoveragegroup.com'
}

export function getAuthRedirectUrl(path: string) {
  const baseUrl = getAppBaseUrl()
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
