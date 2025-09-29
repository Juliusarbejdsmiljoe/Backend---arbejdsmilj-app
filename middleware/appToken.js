export function requireAppToken(req, res, next) {
const header = req.get('x-app-token') || req.get('X-App-Token')
const expected = process.env.APP_UPLOAD_TOKEN
if (!expected) return res.status(500).json({ error: 'Server mangler APP_UPLOAD_TOKEN' })
if (!header || header !== expected) return res.status(401).json({ error: 'Ugyldig app token' })
next()
}