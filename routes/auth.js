import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'


const r = Router()


r.post('/register', async (req, res) => {
try {
const { name, email, password } = req.body || {}
if (!name || !email || !password) return res.status(400).json({ error: 'Manglende felter' })
const exists = await User.findOne({ email })
if (exists) return res.status(409).json({ error: 'Email er allerede i brug' })
const passwordHash = await bcrypt.hash(password, 10)
await User.create({ name, email, passwordHash })
return res.json({ message: 'Bruger oprettet' })
} catch (e) {
return res.status(500).json({ error: e.message })
}
})


r.post('/login', async (req, res) => {
try {
const { email, password } = req.body || {}
const u = await User.findOne({ email })
if (!u) return res.status(401).json({ error: 'Forkert login' })
const ok = await bcrypt.compare(password, u.passwordHash)
if (!ok) return res.status(401).json({ error: 'Forkert login' })
const token = jwt.sign({ uid: u._id.toString(), email: u.email, name: u.name }, process.env.JWT_SECRET || 'dev', { expiresIn: '30d' })
return res.json({ token, name: u.name, email: u.email })
} catch (e) {
return res.status(500).json({ error: e.message })
}
})


export default r