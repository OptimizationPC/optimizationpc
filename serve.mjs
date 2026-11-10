import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const port = Number(process.env.PORT || 8080)
const ADMIN_KEY = process.env.ADMIN_KEY || 'bashmak-admin'
const DATA_FILE = path.join(root, 'reviews.json')
const PHOTOS_DIR = path.join(root, 'photos')

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function readReviews() {
  try {
    const list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeReviews(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8')
}

function sendJson(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1e6) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function isAuthorized(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

function sanitizeReview(input) {
  const name = String(input.name || '').trim().slice(0, 60)
  const text = String(input.text || '').trim().slice(0, 1200)
  const tag = String(input.tag || '').trim().slice(0, 40)
  let link = String(input.link || '').trim().slice(0, 300)
  if (link) {
    try {
      const url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`)
      link = url.hostname.includes('.') ? url.href : ''
    } catch {
      link = ''
    }
  }
  let rating = parseInt(input.rating, 10)
  if (!Number.isFinite(rating)) rating = 5
  rating = Math.min(5, Math.max(1, rating))
  return { name, text, tag, link, rating }
}

async function handleApi(req, res, url) {
  const pathname = url.pathname

  if (pathname === '/api/verify' && req.method === 'GET') {
    return sendJson(res, isAuthorized(req) ? 200 : 401, { ok: isAuthorized(req) })
  }

  if (pathname === '/api/reviews' && req.method === 'GET') {
    return sendJson(res, 200, readReviews())
  }

  if (pathname === '/api/reviews' && req.method === 'POST') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Нужен ключ администратора' })
    let input
    try {
      input = JSON.parse(await readBody(req))
    } catch {
      return sendJson(res, 400, { error: 'Некорректный JSON' })
    }
    const { name, text, tag, link, rating } = sanitizeReview(input)
    if (!name || !text) return sendJson(res, 400, { error: 'Имя и текст обязательны' })

    const reviews = readReviews()
    const review = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      link,
      tag,
      rating,
      text,
      date: new Date().toISOString(),
    }
    reviews.push(review)
    writeReviews(reviews)
    return sendJson(res, 201, review)
  }

  const match = pathname.match(/^\/api\/reviews\/([^/]+)$/)
  if (match) {
    const id = decodeURIComponent(match[1])
    const reviews = readReviews()
    const idx = reviews.findIndex((r) => String(r.id) === id)

    if (req.method === 'GET') {
      if (idx === -1) return sendJson(res, 404, { error: 'Отзыв не найден' })
      return sendJson(res, 200, reviews[idx])
    }

    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Нужен ключ администратора' })
    if (idx === -1) return sendJson(res, 404, { error: 'Отзыв не найден' })

    if (req.method === 'DELETE') {
      reviews.splice(idx, 1)
      writeReviews(reviews)
      return sendJson(res, 200, { ok: true })
    }

    if (req.method === 'PUT') {
      let input
      try {
        input = JSON.parse(await readBody(req))
      } catch {
        return sendJson(res, 400, { error: 'Некорректный JSON' })
      }
      const clean = sanitizeReview(input)
      if (!clean.name || !clean.text) return sendJson(res, 400, { error: 'Имя и текст обязательны' })
      reviews[idx] = { ...reviews[idx], ...clean }
      writeReviews(reviews)
      return sendJson(res, 200, reviews[idx])
    }
  }

  return sendJson(res, 404, { error: 'Неизвестный API-запрос' })
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url)
    } catch {
      sendJson(res, 500, { error: 'Внутренняя ошибка сервера' })
    }
    return
  }

  let urlPath = decodeURIComponent(url.pathname)
  if (urlPath === '/') urlPath = '/index.html'
  const filePath = path.join(root, urlPath)
  if (!filePath.startsWith(path.resolve(root))) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, '404.html'), (notFoundErr, notFoundData) => {
        if (notFoundErr) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(notFoundData)
      })
      return
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream' })
    res.end(data)
  })
}).listen(port, () => {
  console.log(`BASHMAK PC site running at http://localhost:${port}`)
  console.log(`Admin panel: http://localhost:${port}/admin.html`)
  console.log(`Admin key: ${ADMIN_KEY} (override with ADMIN_KEY env var)`)
})
