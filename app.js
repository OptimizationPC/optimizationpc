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
            colorB: '#ffa600',
            colorC: '#ffa600',
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
const revealEls = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })

  revealEls.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${Math.min((i % 4) * 80, 240)}ms`)
    observer.observe(el)
  })
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'))
}

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
  let value = 38

  // Seed the history with a rising curve
  for (let i = 0; i < maxPoints; i++) {
    value += 0.55 + Math.random() * 0.7
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
    points.push(prev + 0.25 + Math.random() * 1.15)
    if (points.length > maxPoints) points.shift()
  }

  function tracePath(yFor) {
    const stepX = W / (points.length - 1)
    ctx.beginPath()
    ctx.moveTo(0, yFor(points[0]))
    for (let i = 1; i < points.length; i++) {
      const x = i * stepX
      const y = yFor(points[i])
      const px = (i - 1) * stepX
      const py = yFor(points[i - 1])
      const cx = (px + x) / 2
      ctx.bezierCurveTo(cx, py, cx, y, x, y)
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
    ctx.lineWidth = 2.5
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

// --- FPS counter: 60 → 240 → repeat ---
const perfNumber = document.querySelector('.perf-number[data-count]')
if (perfNumber) {
  const target = parseInt(perfNumber.dataset.count, 10) || 240
  const from = 60
  const duration = 2600
  const hold = 900
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
      else setTimeout(cycle, hold)
    }
    requestAnimationFrame(tick)
  }

  setTimeout(cycle, 400)
}
