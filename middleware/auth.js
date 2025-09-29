// middleware/auth.js
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' })
}

// Valgfrit auth – sætter req.userId hvis token er gyldig, ellers ignoreres
export async function optionalAuth(req, res, next) {
  const auth = req.header('Authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return next()
  try {
    const payload = jwt.verify(m[1], JWT_SECRET)
    req.userId = payload.sub
  } catch {
    // Ignorér ugyldig token i optionalAuth – ruter kan stadig køre
  }
  next()
}

// Krævet auth – 401 hvis token mangler eller er ugyldig
export async function requireAuth(req, res, next) {
  const auth = req.header('Authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: 'Missing bearer token' })
  try {
    const payload = jwt.verify(m[1], JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Hjælper: hent bruger og læg på req.user (valgfrit)
export async function attachUser(req, _res, next) {
  if (!req.userId) return next()
  try {
    req.user = await User.findById(req.userId).lean()
  } catch {}
  next()
}
