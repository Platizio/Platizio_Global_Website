import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'

interface Member {
  name: string
  role: string
  image: string
}

const TEAM: Member[] = [
  { name: 'Aanyaa Bhardwaj', role: 'Social Media Executive', image: '/team/aanyaa-bhardwaj.jpg' },
  { name: 'Aayush Sharma', role: 'Product Software Developer', image: '/team/aayush-sharma.jpg' },
  { name: 'Anuj Pal', role: 'Senior Financial Market Analyst', image: '/team/anuj-pal.jpg' },
  { name: 'Deepika Agarwal', role: 'Financial Market Analyst', image: '/team/deepika-agarwal.jpg' },
  { name: 'Kartik Vishnani', role: 'Financial Market Analyst', image: '/team/kartik-vishnani.jpg' },
  { name: 'Kavya Khatri', role: 'Social Media Executive', image: '/team/kavya-khatri.jpg' },
  { name: 'Sumit Katyal', role: 'Product Software Developer', image: '/team/sumit-katyal.jpg' },
  { name: 'Vinayak Tyagi', role: 'Product Software Developer', image: '/team/vinayak-tyagi.jpg' },
]

const INTERVAL = 4500
const N = TEAM.length

const initials = (n: string) =>
  n.replace(/[^a-zA-Z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '★'

// shortest signed distance on the ring
function offset(i: number, current: number) {
  let d = i - current
  if (d > N / 2) d -= N
  if (d < -N / 2) d += N
  return d
}

function cardStyle(o: number): CSSProperties {
  const abs = Math.abs(o)
  let x = 0, scale = 1, rotY = 0, z = 0, opacity = 1, blur = 0
  if (o === 0) { x = 0; scale = 1; rotY = 0; z = 5 }
  else if (abs === 1) { x = o * 60; scale = 0.8; rotY = -o * 22; z = 3; opacity = 0.55 }
  else if (abs === 2) { x = o * 50 + (o > 0 ? 52 : -52); scale = 0.64; rotY = -o * 26; z = 1; opacity = 0.26; blur = 1 }
  else { x = o * 40; scale = 0.5; rotY = -o * 28; z = 0; opacity = 0 }
  return {
    transform: `translateY(-50%) translateX(${x}%) scale(${scale}) rotateY(${rotY}deg)`,
    opacity,
    zIndex: z,
    filter: blur ? `saturate(.7) brightness(.9) blur(${blur}px)` : undefined,
    pointerEvents: opacity === 0 ? 'none' : 'auto',
  }
}

export default function TeamCarousel() {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reduceRef = useRef(false)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)

  const go = useCallback((i: number) => setCurrent(((i % N) + N) % N), [])
  const next = useCallback(() => setCurrent((c) => (c + 1) % N), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + N) % N), [])

  // Respect reduced-motion: no autoplay; otherwise start playing on mount.
  useEffect(() => {
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduceRef.current) setPlaying(true)
  }, [])

  // Autoplay — re-armed whenever current changes so manual navigation resets the timer.
  useEffect(() => {
    if (!playing || reduceRef.current) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % N), INTERVAL)
    return () => clearInterval(t)
  }, [playing, current])

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => setPlaying(!document.hidden && !reduceRef.current)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const pause = () => setPlaying(false)
  const resume = () => { if (!draggingRef.current && !reduceRef.current) setPlaying(true) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    startXRef.current = e.clientX
    setPlaying(false)
    try { stageRef.current?.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const dx = e.clientX - startXRef.current
    if (Math.abs(dx) > 45) { if (dx < 0) next(); else prev() }
    else resume()
  }
  const onPointerCancel = () => { draggingRef.current = false; resume() }

  const live = `${TEAM[current].name}, ${TEAM[current].role} (${current + 1} of ${N})`

  return (
    <div
      className={`team-carousel${playing ? ' is-playing' : ''}`}
      style={{ '--interval': `${INTERVAL}ms` } as CSSProperties}
    >
      <div
        className="tc-stage"
        ref={stageRef}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Platizio team members"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="tc-track">
          {TEAM.map((m, i) => {
            const o = offset(i, current)
            const active = o === 0
            return (
              <article
                key={m.name}
                className={`tc-card${active ? ' is-active' : ''}`}
                style={cardStyle(o)}
                role="group"
                aria-label={`${m.name}, ${m.role}`}
                onClick={() => { if (i !== current) go(i) }}
              >
                <div className="tc-mono" aria-hidden="true">{initials(m.name)}</div>
                <img
                  className="tc-photo"
                  src={m.image}
                  alt={m.name}
                  loading="lazy"
                  draggable={false}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div className="tc-grain" aria-hidden="true" />
                <div className="tc-scrim" aria-hidden="true" />
                <div className="tc-caption">
                  <span className="tc-bar" aria-hidden="true" />
                  <p className="tc-name">{m.name}</p>
                  <p className="tc-role">{m.role}</p>
                </div>
              </article>
            )
          })}
        </div>

        <button className="tc-arrow prev" onClick={prev} aria-label="Previous team member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button className="tc-arrow next" onClick={next} aria-label="Next team member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      <div className="tc-dots" role="tablist" aria-label="Choose team member">
        {TEAM.map((m, i) => (
          <button
            key={m.name}
            className={`tc-dot${i === current ? ' is-active' : ''}`}
            role="tab"
            aria-label={m.name}
            aria-selected={i === current}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className="tc-progress" aria-hidden="true">
        <i key={`${current}-${playing}`} />
      </div>
      <p className="sr-only" aria-live="polite">{live}</p>
    </div>
  )
}
