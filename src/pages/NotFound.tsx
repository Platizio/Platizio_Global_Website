import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

export default function NotFound() {
  return (
    <>
      <SEO
        title="Page Not Found (404)"
        description="The page you are looking for doesn't exist or has moved. Explore Platizio Global to invest in US Stocks and ETFs from India."
        canonical="/404"
        noindex
      />

      <section className="notfound">
        <div className="container">
          <span className="notfound-code">404</span>
          <h1>This page can&apos;t be found</h1>
          <p>
            The page you&apos;re looking for doesn&apos;t exist, may have moved, or the link is
            incorrect. Let&apos;s get you back on track.
          </p>
          <div className="notfound-actions">
            <Link className="btn btn-gold btn-lg" to="/">
              Back to Home <ArrowIcon />
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/products">
              Explore Products
            </Link>
          </div>

          <div className="notfound-links">
            <span>Popular pages:</span>
            <Link to="/products">Products</Link>
            <Link to="/faqs">FAQs</Link>
            <Link to="/user-guide">User Guide</Link>
            <Link to="/about">About Us</Link>
          </div>
        </div>
      </section>
    </>
  )
}
