import SEO, { breadcrumbSchema } from '../../src/components/SEO'
import { Link } from 'react-router-dom'
import NewsRail from '../components/NewsRail'
import VideoShowcase from '../components/VideoShowcase'
import MediaPanels from '../components/MediaPanels'
import NewsletterSignup from '../components/NewsletterSignup'

export default function Media() {
  return (
    <>
      <SEO
        title="Media — Videos, Articles &amp; Market Explainers"
        description="Videos, guides and explainers on investing in US Stocks and ETFs from India — routes, taxes, ETFs, currency risk and LRS compliance, from Platizio Global."
        canonical="/media"
        jsonLd={breadcrumbSchema([['Home', '/'], ['Media', '/media']])}
      />

      {/* ===== 1. NEWS RAIL — sits directly under the header ===== */}
      <NewsRail />

      {/* ===== 2. PAGE HERO ===== */}
      <section className="page-hero media-hero">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link><span>/</span><span>Media</span>
          </div>
          <h1>Learn before you invest</h1>
          <p>
            Everything we publish on global investing — videos, explainers and guides,
            written for Indian investors.
          </p>
        </div>
      </section>

      {/* ===== 3. VIDEO ===== */}
      <VideoShowcase />

      {/* ===== 4. BLOG + ARTICLES ===== */}
      <MediaPanels />

      {/* ===== 5. NEWSLETTER ===== */}
      <NewsletterSignup />
    </>
  )
}
