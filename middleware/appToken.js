// middleware/appToken.js
export function requireAppToken(req, res, next) {
  if (req.method === 'OPTIONS') return next()

  // Tillad health offentligt (både /health og /api/health)
  const path = req.path || ''
  const base = req.baseUrl || ''
  const full = base + path
  if (full.startsWith('/health') || full.startsWith('/api/health')) {
    return next()
  }

  const configured = (process.env.APP_UPLOAD_TOKEN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (configured.length === 0) {
    return res.status(500).json({ error: 'APP_UPLOAD_TOKEN is not set on the server' })
  }

  const provided = (req.header('X-App-Token') || req.header('x-app-token') || '').trim()
  if (configured.includes(provided)) return next()

  return res.status(401).json({ error: 'Invalid app token' })
}
