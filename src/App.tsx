import { Routes, Route, useLocation, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ContactModal from './components/ContactModal'
import Home from './pages/Home'
import Products from './pages/Products'
import Media from './pages/Media'
import About from './pages/About'
import FAQs from './pages/FAQs'
import CurrencyRisk from './pages/articles/CurrencyRisk'
import StocksVsEtfs from './pages/articles/StocksVsEtfs'
import WhyIndianInvestors from './pages/articles/WhyIndianInvestors'
import WhyInternationalInvesting2026 from './pages/articles/WhyInternationalInvesting2026'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Disclaimer from './pages/Disclaimer'

// Handles scroll-to-top / hash-scroll on route changes,
// and re-wires the IntersectionObserver reveal animation
// after each navigation (same logic as the original main.js).
function ScrollHandler() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 120)
    } else {
      window.scrollTo({ top: 0 })
    }
  }, [location.pathname, location.hash])

  useEffect(() => {
    const timer = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>('.reveal:not(.in-view)')
      if (!('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('in-view'))
        return
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view')
              io.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      )
      els.forEach((el) => io.observe(el))
      return () => io.disconnect()
    }, 60)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return null
}

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <ContactModal />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ScrollHandler />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/media" element={<Media />} />
          <Route path="/about" element={<About />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/articles/why-international-investing-matters-2026" element={<WhyInternationalInvesting2026 />} />
          <Route path="/articles/currency-risk" element={<CurrencyRisk />} />
          <Route path="/articles/stocks-vs-etfs" element={<StocksVsEtfs />} />
          <Route path="/articles/why-indian-investors-global" element={<WhyIndianInvestors />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
