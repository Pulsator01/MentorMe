import { useEffect, useRef } from 'react'

function WarpBackground({ speed = 0.2, starCount = 100, backgroundColor = '#020617' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let animationFrameId

    const resize = () => {
      const parent = canvas.parentElement

      if (!parent) {
        return
      }

      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width - canvas.width / 2,
      y: Math.random() * canvas.height - canvas.height / 2,
      z: Math.random() * canvas.width,
    }))

    const tick = () => {
      context.fillStyle = backgroundColor
      context.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach((star) => {
        star.z -= speed * 24

        if (star.z <= 1) {
          star.z = canvas.width
          star.x = Math.random() * canvas.width - canvas.width / 2
          star.y = Math.random() * canvas.height - canvas.height / 2
        }

        const projection = 128 / star.z
        const x = star.x * projection + canvas.width / 2
        const y = star.y * projection + canvas.height / 2
        const radius = Math.max(0.4, (1 - star.z / canvas.width) * 2.8)
        const alpha = Math.min(0.85, 1 - star.z / canvas.width)

        context.fillStyle = `rgba(255,255,255,${alpha})`
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      })

      animationFrameId = window.requestAnimationFrame(tick)
    }

    tick()

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [backgroundColor, speed, starCount])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" />
}

export default WarpBackground
