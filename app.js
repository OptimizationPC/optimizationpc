import { createShader } from 'shaders/js'

const canvas = document.getElementById('shader-canvas')
const body = document.body

// --- Shader background ("Evening Starling", shaders.com id 4748559) ---
async function startShader() {
  if (!canvas || !navigator.gpu) {
    body.classList.add('shader-failed')
    return
  }

  try {
    const shader = await createShader(canvas, {
      components: [
        {
          type: 'RoundedRect',
          id: 'idmw55fm7sr2n7fv7vp',
          props: {
            center: { x: 0.5, y: 0.51 },
            color: '#000000',
            height: 0.5319,
            strokeColor: '#00000000',
            width: 0.9139,
          },
        },
        {
          type: 'FlowingGradient',
          id: 'idmw3v7s4chuot04689',
          props: {
            boundingBox: { origin: 'center' },
            colorA: '#000000',
            colorB: '#ffa600d9',
            colorC: '#ffa600b3',
            colorD: '#000000',
            distortion: 0.2,
            opacity: 0.7,
            seed: 45,
          },
        },
      ],
    }, {
      disableTelemetry: true,
      onReady: () => {
        body.classList.add('shader-ready')
        canvas.style.opacity = '0.92'
      },
    })

    let resizeTimer
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => shader.resize(), 120)
    }, { passive: true })

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) shader.pause()
      else shader.resume()
    })

    // Safety net: show the canvas even if onReady never fires
    setTimeout(() => {
      body.classList.add('shader-ready')
      canvas.style.opacity = '0.92'
    }, 2500)
  } catch (err) {
    console.warn('[shader] failed to start:', err)
    body.classList.add('shader-failed')
    body.classList.add('shader-ready')
  }
}

startShader()

// --- Header scroll state ---
const header = document.querySelector('.site-header')
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 16)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// --- Reveal on scroll ---
let revealObserver = null
const revealEls = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })

  revealEls.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${Math.min((i % 4) * 80, 240)}ms`)
    revealObserver.observe(el)
  })
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'))
}

// --- Reviews: load from /api/reviews and render into #reviews-grid ---
const reviewsGrid = document.getElementById('reviews-grid')

async function loadReviews() {
  if (!reviewsGrid) return
  const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
  const formatDate = (iso) => {
    try {
      return iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
    } catch { return '' }
  }

  try {
    // GitHub Pages (static): read reviews.json. Local server: prefer the live API.
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    let list = null

    if (isLocal) {
      try {
        const res = await fetch('api/reviews', { headers: { accept: 'application/json' } })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) list = data
        }
      } catch {}
    }

    if (list === null) {
      try {
        const res = await fetch('reviews.json', { cache: 'no-store' })
        if (res.ok) list = await res.json()
      } catch {}
    }

    if (!Array.isArray(list) || !list.length) {
      reviewsGrid.innerHTML = '<p class="reviews-empty">Пока нет отзывов.</p>'
      return
    }

    reviewsGrid.innerHTML = list.map((r) => {
      const stars = Array.from({ length: 5 }, (_, i) =>
        `<span class="review-star${i < (r.rating || 5) ? ' is-filled' : ''}" aria-hidden="true">★</span>`
      ).join('')
      const dateStr = formatDate(r.date)
      const tagHtml = r.tag ? `<span class="review-tag">${escapeHtml(r.tag)}</span>` : ''
      const textHtml = escapeHtml(r.text || '').replace(/\n/g, '<br>')

      return `
        <article class="review-card reveal">
          <div class="review-header">
            <span class="review-name">${escapeHtml(r.name || 'Клиент')}</span>
            ${tagHtml}
          </div>
          <div class="review-stars" aria-label="Оценка: ${r.rating || 5} из 5">${stars}</div>
          <p class="review-text">${textHtml}</p>
          ${dateStr ? `<time class="review-date" datetime="${escapeHtml(r.date || '')}">${escapeHtml(dateStr)}</time>` : ''}
        </article>
      `
    }).join('')

    // Observe newly added review cards for reveal animation
    if (revealObserver) {
      reviewsGrid.querySelectorAll('.reveal:not(.is-visible)').forEach((el, i) => {
        el.style.setProperty('--reveal-delay', `${Math.min(i * 60, 180)}ms`)
        revealObserver.observe(el)
      })
    } else {
      reviewsGrid.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))
    }
  } catch {
    reviewsGrid.innerHTML = '<p class="reviews-empty">Не удалось загрузить отзывы.</p>'
  }
}

loadReviews()

// --- Live chart: endlessly rising line ---
function initChart() {
  const chartCanvas = document.querySelector('.chart__canvas')
  if (!chartCanvas) return

  const ctx = chartCanvas.getContext('2d')
  if (!ctx) return

  const W = 420
  const H = 150
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  chartCanvas.width = W * dpr
  chartCanvas.height = H * dpr
  ctx.scale(dpr, dpr)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const maxPoints = 72
  const points = []
  let value = 40
  let zigDir = 1

  // Seed the history with a rising zigzag
  for (let i = 0; i < maxPoints; i++) {
    value += zigDir > 0 ? 1.6 + Math.random() * 1.4 : -(0.35 + Math.random() * 0.6)
    zigDir = -zigDir
    points.push(value)
  }

  let displayMax = points[points.length - 1] * 1.06
  let last = performance.now()
  let raf = 0
  const addEvery = 90

  function addPoint(now) {
    if (now - last < addEvery) return
    last = now
    const prev = points[points.length - 1]
    // Zigzag: sharp step up, small dip down — net growth forever
    const delta = zigDir > 0
      ? 1.5 + Math.random() * 1.6
      : -(0.3 + Math.random() * 0.7)
    zigDir = -zigDir
    points.push(prev + delta)
    if (points.length > maxPoints) points.shift()
  }

  function tracePath(yFor) {
    const stepX = W / (points.length - 1)
    ctx.beginPath()
    ctx.moveTo(0, yFor(points[0]))
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(i * stepX, yFor(points[i]))
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)

    const newest = points[points.length - 1]
    displayMax += (newest * 1.06 - displayMax) * 0.04

    const padTop = 12
    const padBottom = 8
    const span = Math.max(displayMax, 1)
    const yFor = (v) => padTop + (1 - v / span) * (H - padTop - padBottom)

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, .09)'
    ctx.lineWidth = 1
    for (const g of [0.25, 0.5, 0.75]) {
      const y = padTop + g * (H - padTop - padBottom)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Area under the line
    tracePath(yFor)
    ctx.lineTo(W, H)
    ctx.lineTo(0, H)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, padTop, 0, H)
    fill.addColorStop(0, 'rgba(255, 166, 0, .32)')
    fill.addColorStop(1, 'rgba(255, 166, 0, 0)')
    ctx.fillStyle = fill
    ctx.fill()

    // Line
    tracePath(yFor)
    const stroke = ctx.createLinearGradient(0, 0, W, 0)
    stroke.addColorStop(0, '#ffb340')
    stroke.addColorStop(1, '#ff7a00')
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.shadowColor = 'rgba(255, 166, 0, .75)'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    // Head dot
    const headY = Math.max(padTop + 2, yFor(newest))
    ctx.beginPath()
    ctx.arc(W - 4, headY, 4.2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffa600'
    ctx.shadowColor = 'rgba(255, 166, 0, .9)'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0
  }

  function loop(now) {
    addPoint(now)
    draw()
    raf = requestAnimationFrame(loop)
  }

  if (reduced) {
    draw()
    return
  }

  let visible = true
  const start = () => {
    if (visible && !raf && !document.hidden) raf = requestAnimationFrame(loop)
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
      if (!visible && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      if (visible) start()
    }, { threshold: 0.05 }).observe(chartCanvas)
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    } else {
      start()
    }
  })

  start()
}

initChart()

// --- FPS counter: smooth 60 → 240, glitch reset, repeat ---
const perfNumber = document.querySelector('.perf-number[data-count]')
if (perfNumber) {
  const target = parseInt(perfNumber.dataset.count, 10) || 240
  const from = 60
  const duration = 3200
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const glitchReset = (done) => {
    // Chromatic jitter (CSS) + number scramble, then land on 60
    perfNumber.classList.add('is-glitching')
    let ticks = 0
    const total = 9
    const iv = setInterval(() => {
      ticks++
      perfNumber.textContent = Math.floor(from + Math.random() * (target - from))
      if (ticks >= total) {
        clearInterval(iv)
        perfNumber.textContent = from
        perfNumber.classList.remove('is-glitching')
        done()
      }
    }, 55)
  }

  const cycle = () => {
    if (reduced) {
      perfNumber.textContent = target
      return
    }
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      perfNumber.textContent = Math.round(from + (target - from) * eased)
      if (p < 1) requestAnimationFrame(tick)
      else setTimeout(() => glitchReset(cycle), 850)
    }
    requestAnimationFrame(tick)
  }

  perfNumber.textContent = from
  setTimeout(cycle, 500)
}
