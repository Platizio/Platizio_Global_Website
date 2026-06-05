import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { TRADING_PLATFORM_URL } from '../constants'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { openContact } = useAppContext()
  const location = useLocation()

  // Sticky shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu and dropdown on navigation
  useEffect(() => {
    setMenuOpen(false)
    setProductsOpen(false)
  }, [location.pathname])

  const isMediaActive = location.pathname === '/media' || location.pathname.startsWith('/articles')

  return (
    <header className="site-header" style={{ boxShadow: scrolled ? 'var(--shadow-sm)' : 'none' }}>
      <nav className="nav" aria-label="Primary">
        <Link to="/" className="logo" aria-label="Platizio Global home">
          <picture>
            <source srcSet="/Logo_V2.webp" type="image/webp" />
            <img src="/Logo_V2.png" alt="Platizio Global" className="logo-img" />
          </picture>
        </Link>

        <ul className={`nav-links${menuOpen ? ' is-open' : ''}`} role="menubar">
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : undefined)} end>
              Home
            </NavLink>
          </li>
          <li className={`has-dropdown${productsOpen ? ' products-open' : ''}`}>
            <NavLink
              to="/products"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={(e) => {
                // On mobile, toggle the dropdown instead of navigating immediately
                if (menuOpen) { e.preventDefault(); setProductsOpen((v) => !v) }
              }}
              aria-expanded={productsOpen}
            >
              Products <span className="dropdown-chevron" aria-hidden="true" />
            </NavLink>
            <ul className="dropdown" role="menu">
              <li>
                <Link to="/products#us-stocks" onClick={() => setMenuOpen(false)}>
                  <strong>US Stocks</strong>
                  <span>Invest in leading US-listed companies</span>
                </Link>
              </li>
              <li>
                <Link to="/products#us-etfs" onClick={() => setMenuOpen(false)}>
                  <strong>US ETFs</strong>
                  <span>Diversified baskets, indices &amp; themes</span>
                </Link>
              </li>
            </ul>
          </li>
          <li>
            <NavLink
              to="/media"
              className={() => (isMediaActive ? 'active' : undefined)}
            >
              Media
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              About Us
            </NavLink>
          </li>
          <li>
            <NavLink to="/faqs" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              FAQs
            </NavLink>
          </li>
        </ul>

        <div className="nav-actions">
          <button
            className="btn btn-pulse"
            onClick={() => { openContact(); setMenuOpen(false) }}
          >
            Contact Us
          </button>
          <a
            className="btn btn-primary"
            href={TRADING_PLATFORM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Start Investing
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
          <button
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  )
}
