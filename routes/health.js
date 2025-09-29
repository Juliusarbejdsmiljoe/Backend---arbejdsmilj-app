// routes/health.js
import { Router } from 'express'
import mongoose from 'mongoose'
import { BUILD_TAG } from '../server.js'

const router = Router()
const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }

// GET /health eller /api/health
router.get('/', (_req, res) => {
  const rs = mongoose.connection.readyState
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    db: map[rs] ?? rs,
    readyState: rs,
    build: BUILD_TAG,
    uptimeSec: Math.round(process.uptime()),
  })
})

// GET /health/mongo eller /api/health/mongo
router.get('/mongo', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) await mongoose.connection.asPromise()
    await mongoose.connection.db.admin().command({ ping: 1 })
    res.json({ ok: true, build: BUILD_TAG })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e), build: BUILD_TAG })
  }
})

export default router
