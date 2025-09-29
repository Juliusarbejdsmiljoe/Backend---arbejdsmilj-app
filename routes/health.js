// routes/health.js
import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }

// GET /api/health
router.get('/', (_req, res) => {
  const rs = mongoose.connection.readyState
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    db: map[rs] ?? rs,
    readyState: rs,
    uptimeSec: Math.round(process.uptime()),
  })
})

// GET /api/health/mongo
router.get('/mongo', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connection.asPromise()
    }
    await mongoose.connection.db.admin().command({ ping: 1 })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

export default router
