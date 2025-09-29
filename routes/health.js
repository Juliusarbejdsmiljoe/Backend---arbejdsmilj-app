// routes/health.js
import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }

// GET /api/health  → generel status + db-state
router.get('/', (_req, res) => {
  const rs = mongoose.connection.readyState
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    db: stateMap[rs] ?? rs,
    readyState: rs,
    uptimeSec: Math.round(process.uptime())
  })
})

// GET /api/health/mongo  → direkte ping til MongoDB
router.get('/mongo', async (_req, res) => {
  try {
    // Hvis ikke connected, lad det fejle tydeligt
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connection.asPromise() // bubble evt. fejl op
    }
    await mongoose.connection.db.admin().command({ ping: 1 })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

export default router
