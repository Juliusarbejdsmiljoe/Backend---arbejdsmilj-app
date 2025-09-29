// routes/health.js
import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/', (_req, res) => {
  const rs = mongoose.connection.readyState // 0..3
  const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  res.json({ ok: true, ts: new Date().toISOString(), db: map[rs] ?? rs })
})

router.get('/mongo', async (_req, res) => {
  try {
    await mongoose.connection.db.admin().command({ ping: 1 })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
