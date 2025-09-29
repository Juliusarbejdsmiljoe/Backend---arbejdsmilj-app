// server.js
// Backend - arbejdsmiljø app (ESM, Node >=20)

import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Routers & middleware
import { requireAppToken } from './middleware/appToken.js'
import apvRouter from './routes/apv.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'

// --- Paths -------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// --- App ---------------------------------------------------------------------
const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Static files (PDF etc.)
app.use('/uploads', express.static(uploadsDir, { maxAge: '1h', etag: true }))

// --- Mongo / Mongoose --------------------------------------------------------
const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }

mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connected:', mongoose.connection.host, 'db:', mongoose.connection.name)
})
mongoose.connection.on('error', (err) => {
  console.error('🔴 MongoDB error:', err?.message || err)
})
mongoose.connection.on('disconnected', () => {
  console.warn('🟡 MongoDB disconnected')
})

async function connectDB() {
  let uri = (process.env.MONGODB_URI || '').trim()
  if (uri.startsWith('MONGODB_URI=')) uri = uri.slice('MONGODB_URI='.length).trim()
  if (!uri) {
    console.warn('⚠️  MONGODB_URI mangler – starter uden database.')
    return
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    console.error('❌ MONGODB_URI har forkert format (skal starte med "mongodb://" eller "mongodb+srv://").')
    return
  }
  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || 'arbejdsmiljoe',
      serverSelectionTimeoutMS: 8000,
    })
  } catch (err) {
    console.error('❌ MongoDB connect-fejl:', err?.message || err)
  }
}

// --- PUBLIC sanity routes (direkte i serveren) -------------------------------

// Root (sanity-check)
app.get('/', (_req, res) => res.send('OK — backend kører'))

// /health (offentlig)
app.get('/health', (_req, res) => {
  const rs = mongoose.connection.readyState
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    db: stateMap[rs] ?? rs,
    readyState: rs,
    uptimeSec: Math.round(process.uptime()),
  })
})

// /health/mongo (offentlig) – direkte ping
app.get('/health/mongo', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) await mongoose.connection.asPromise()
    await mongoose.connection.db.admin().command({ ping: 1 })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) })
  }
})

// --- Protected API -----------------------------------------------------------
// Kræv X-App-Token på resten af /api/*
app.use('/api', requireAppToken)

// APV / Auth / Upload
app.use('/api/apv', apvRouter)
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)

// 404 for ukendte API-ruter
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

// --- Start -------------------------------------------------------------------
const PORT = process.env.PORT || 10000
;(async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 Server lytter på :${PORT}  (DB: ${stateMap[mongoose.connection.readyState]})`)
    const publicBase =
      process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`
    console.log('🌍 PUBLIC_BASE_URL =', publicBase)
  })
})()
