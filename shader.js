// --- Shader background ("Evening Starling", shaders.com id 4748559) ---
// The WebGL shader is optional. It loads only in browsers that support it,
// otherwise the CSS fallback gradient stays visible and the site keeps working.

const body = document.body

async function startShader() {
  try {
    const canvas = document.getElementById('shader-canvas')
    if (!canvas || !navigator.gpu) {
      body.classList.add('shader-failed')
      return
    }

    let createShader
    try {
      ;({ createShader } = await import('shaders/js'))
    } catch (err) {
      console.warn('[shader] bundle unavailable:', err)
      body.classList.add('shader-failed')
      return
    }

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