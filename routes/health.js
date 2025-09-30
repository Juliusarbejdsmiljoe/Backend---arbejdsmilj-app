// routes/health.js
import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }

function buildTag() {
  const raw =
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.BUILD ||
    ''
  return raw ? String(raw).slice(0, 7) : undefined
}

// GET /api/health
router.get('/', (_req, res) => {
  const rs = mongoose.connection.readyState
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    db: map[rs] ?? rs,
    readyState: rs,
    build: buildTag(),
    uptimeSec: Math.round(process.uptime()),
  })
})

// GET /api/health/mongo
router.get('/mongo', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) await mongoose.connection.asPromise()
    await mongoose.connection.db.admin().command({ ping: 1 })
    res.json({ ok: true, build: buildTag() })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e), build: buildTag() })
  }
})

export default router
