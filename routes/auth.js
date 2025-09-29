// routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import crypto from 'node:crypto'

const router = Router()

// POST /api/auth/register  { name, email, password }
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' })
  }
  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ error: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 12)
  const code = crypto.randomBytes(4).toString('hex') // 8 hex-tegn pr. bruger

  const user = await User.create({ name, email, passwordHash, code })
  const token = signToken(user)
  res.json({ token, user: { name: user.name, email: user.email, code: user.code } })
})

// POST /api/auth/login { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user)
  res.json({ token, user: { name: user.name, email: user.email, code: user.code } })
})

// GET /api/auth/me (kræver bearer token)
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).lean()
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ name: user.name, email: user.email, code: user.code })
})

export default router
