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

// --- Animated FPS counter ---
const perfNumber = document.querySelector('.perf-number[data-count]')
if (perfNumber) {
  const target = parseInt(perfNumber.dataset.count, 10) || 240
  const start = parseInt(perfNumber.textContent, 10) || 96
  const duration = 1600
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const animate = () => {
    if (reduced) {
      perfNumber.textContent = target
      return
    }
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      perfNumber.textContent = Math.round(start + (target - start) * eased)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // Animate shortly after load so the hero is painted first
  setTimeout(animate, 400)
}
