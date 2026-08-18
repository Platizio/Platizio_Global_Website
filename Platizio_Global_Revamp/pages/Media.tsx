import SEO, { breadcrumbSchema } from '../../src/components/SEO'
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

      {/* ===== 2. VIDEO ===== */}
      <VideoShowcase />

      {/* ===== 3. BLOG + ARTICLES ===== */}
      <MediaPanels />

      {/* ===== 4. NEWSLETTER ===== */}
      <NewsletterSignup />
    </>
  )
}
