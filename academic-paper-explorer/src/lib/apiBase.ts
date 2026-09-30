// API base follows the app's build `base` so the app works both at "/" (local)
// and under a sub-path mount (e.g. "/papers/" behind a reverse proxy).
const raw = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')

export const API_BASE = `${raw}/api`

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}
