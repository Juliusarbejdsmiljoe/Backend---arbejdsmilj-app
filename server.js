// server.js
// Backend - arbejdsmiljø app
// Kører med ESM ("type":"module") og Node 20+.

import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Middleware + routes
import { requireAppToken } from './middleware/appToken.js'
import healthRouter from './routes/health.js'
import apvRouter from './routes/apv.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import reportsRouter from './routes/reports.js' // (cloud sync MVP)

// --- Paths / uploads-dir -----------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// --- App ---------------------------------------------------------------------
const app = express()
app.set('trust proxy', 1) // Render / proxies

app.use(cors()) // hvis du bruger cookies, skift til: cors({ origin: true, credentials: true })
app.use(express.json({ limit: '10mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Statiske filer (PDF'er m.m.)
app.use('/uploads', express.static(uploadsDir, { maxAge: '1h', etag: true }))

// --- DB (MongoDB Atlas via Mongoose) ----------------------------------------
const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB  = process.env.MONGODB_DB // valgfri (ellers bruger connection default db)

/** Kort navne-map for mongoose.readyState */
const stateMap = { 0: 'OFF', 1: 'ON', 2: 'CONNECTING', 3: 'DISCONNECTING' }

mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connected:', mongoose.connection.host)
})
mongoose.connection.on('error', (err) => {
  console.error('🔴 MongoDB error:', err.message)
})
mongoose.connection.on('disconnected', () => {
  console.warn('🟡 MongoDB disconnected')
})

// Gør DB-state let tilgængelig for fx /api/health
app.locals.dbState = () => mongoose.connection.readyState // 0..3

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI mangler – starter uden database.')
    return
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 8000,
    })
  } catch (err) {
    console.error('❌ MongoDB connect-fejl:', err.message)
    // Vi lader stadig serveren starte, så /health kan rammes
  }
}

// --- Public routes (ingen X-App-Token) --------------------------------------

// Ping root
app.get('/', (_req, res) => {
  res.type('text/plain').send('OK — backend kører')
})

// Public health (til iOS warmup)
app.get('/health', (_req, res) => {
  const rs = mongoose.connection.readyState
  const buildRaw = (process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD || '').toString()
  const build = buildRaw ? buildRaw.slice(0, 7) : undefined
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    db: { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[rs] ?? rs,
    readyState: rs,
    uptimeSec: Math.round(process.uptime()),
    ...(build ? { build } : {})
  })
})

// /api/health (JSON + ping) – holdes åben uden app-token
app.use('/api/health', healthRouter)

// Public visning af APV-session (QR-link fra app’en).
// Vi monterer apvRouter på /apv KUN for GET (så /apv/:sessionId virker),
// men POST-ruter (/start, /stop) er IKKE tilgængelige her.
app.use('/apv',
  (req, res, next) => (req.method === 'GET' ? next() : res.status(404).send('Not found')),
  apvRouter
)

// --- Beskyttede API-ruter (kræver X-App-Token) ------------------------------
app.use('/api', requireAppToken)

// APV (start/stop → genererer PDF i /uploads)
app.use('/api/apv', apvRouter)

// Auth (login/register/me) – forventer Authorization: Bearer <JWT> inde i routeren
app.use('/api/auth', authRouter)

// Uploads (multipart/form-data) – fx POST /api/upload/apv  med felt "file"
app.use('/api/upload', uploadRouter)

// Cloud-rapporter (MVP-synk): POST/GET/DELETE
app.use('/api/reports', reportsRouter)

// 404 for ukendte API-ruter
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler (så vi altid svarer med JSON)
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

// --- Start -------------------------------------------------------------------
const PORT = process.env.PORT || 10000

;(async () => {
  await connectDB()

  app.listen(PORT, () => {
    const map = { 0: 'OFF', 1: 'ON', 2: 'CONNECTING', 3: 'DISCONNECTING' }
    console.log(`🚀 Server lytter på :${PORT}  (DB: ${map[app.locals.dbState()]})`)
    if (process.env.PUBLIC_BASE_URL) {
      console.log('🌍 PUBLIC_BASE_URL =', process.env.PUBLIC_BASE_URL)
    }
  })
})()
