import jwt from 'jsonwebtoken'


export function requireAuth(req, res, next) {
const auth = req.get('authorization') || ''
const [, token] = auth.split(' ')
if (!token) return res.status(401).json({ error: 'Manglende token' })
try {
req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev')
next()
} catch (e) {
return res.status(401).json({ error: 'Ugyldig token' })
}
}