import type { Article } from './types'

import whyInternationalInvesting from './content/why-international-investing-matters-2026'
import lrsExplained from './content/lrs-explained'
import currencyRiskExplained from './content/currency-risk-explained'
import globalTaxes from './content/global-taxes'
import rsuTaxation from './content/rsu-taxation'
import feederVsComboFunds from './content/feeder-vs-combo-funds'
import giftCity from './content/gift-city'
import globalInvestmentAllocation from './content/global-investment-allocation'
import routesForInternationalInvesting from './content/routes-for-international-investing'

// Order = display order. The first three are the featured articles shown on the Media page.
export const ARTICLES: Article[] = [
  {
    slug: 'why-international-investing-matters-2026',
    title: 'Why International Investing Will Matter More Than Ever by 2026',
    category: 'International',
    date: '2026-01-01',
    dateLabel: 'January 2026',
    readTime: '7 min read',
    excerpt: "As we move into 2026, the case for global diversification is stronger than ever — here's why Indian investors should take notice.",
    logo: '/article-1-logo.webp',
    description: 'For Indian investors, international investing is no longer optional. Discover why US Stocks and ETFs are becoming essential for portfolio resilience in 2026 and beyond.',
    bodyHtml: whyInternationalInvesting,
    featured: true,
  },
  {
    slug: 'lrs-explained',
    title: 'LRS Explained: How Indian Residents Can Invest Overseas',
    category: 'LRS & Compliance',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '6 min read',
    excerpt: 'The Liberalised Remittance Scheme is the gateway to overseas investing — how the USD 250,000 limit, TCS, and foreign-asset reporting actually work.',
    logo: '/article-2-logo.jpg',
    description: 'A practical guide to the Liberalised Remittance Scheme (LRS) — the USD 250,000 limit, banking process, TCS, foreign asset reporting, and how Indian residents legally invest in US Stocks and ETFs.',
    bodyHtml: lrsExplained,
    featured: true,
  },
  {
    slug: 'currency-risk-explained',
    title: 'Currency Risk Explained: Why the Rupee-Dollar Movement Matters',
    category: 'Currency',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '5 min read',
    excerpt: 'When you invest abroad, returns ride on two things — the asset and the rupee. See how INR-USD moves can lift or trim your gains.',
    logo: '/article-3-logo.jpg',
    description: 'For Indian investors in US Stocks and ETFs, returns depend on more than performance — the rupee-dollar exchange rate matters too. Understand currency risk, with worked examples, before you invest overseas.',
    bodyHtml: currencyRiskExplained,
    featured: true,
  },
  {
    slug: 'global-taxes',
    title: 'Global Taxes: What Indian Investors Need To Know',
    category: 'Taxation',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '8 min read',
    excerpt: 'The same global exposure can be taxed very differently depending on the route used — capital gains, dividends, withholding tax, LRS TCS, and foreign-asset reporting across US stocks, ETFs, feeder funds, and GIFT City.',
    logo: '/articles/global-taxes.jpg',
    description: 'How global investments are taxed for Indian investors — capital gains, dividends, US withholding tax, LRS TCS, and foreign-asset reporting across direct US stocks, ETFs, Indian feeder funds, and GIFT City structures.',
    bodyHtml: globalTaxes,
  },
  {
    slug: 'rsu-taxation',
    title: 'RSU Taxation Explained for Indian Employees Holding US Shares',
    category: 'Taxation',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '7 min read',
    excerpt: 'How US RSUs are taxed for Indian employees — tax at vesting, capital gains on sale, dividend withholding, Schedule FA reporting, and the concentration risk of holding too much employer stock.',
    logo: '/articles/rsu-taxation.jpg',
    description: 'A practical guide to how US RSUs are taxed for Indian employees — tax at vesting, capital gains on sale, dividend withholding, Schedule FA reporting, and concentration risk.',
    bodyHtml: rsuTaxation,
  },
  {
    slug: 'feeder-vs-combo-funds',
    title: 'Global Investing Made Simple: International Mutual Funds — Feeder vs Combo',
    category: 'Mutual Funds',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '6 min read',
    excerpt: 'International mutual funds let Indian investors access global markets, but feeder funds and combo funds work very differently. A breakdown of each structure and how they compare to direct US Stocks and ETFs.',
    logo: '/articles/feeder-vs-combo-funds.jpg',
    description: 'Feeder funds vs combo (fund-of-funds) international mutual funds for Indian investors — how each structure works, their trade-offs, and how they compare to direct US Stocks and ETFs.',
    bodyHtml: feederVsComboFunds,
  },
  {
    slug: 'gift-city',
    title: "GIFT City: India's Gateway to Global Investing",
    category: 'GIFT City',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '6 min read',
    excerpt: "GIFT City and India's IFSC give investors a regulated, India-linked gateway to global markets — how the route works under the LRS, and the tax, currency, and regulatory factors to weigh.",
    logo: '/articles/gift-city.jpg',
    description: "How GIFT City and India's International Financial Services Centre (IFSC) give Indian investors a regulated gateway to US stocks and ETFs under the LRS — with the tax, currency, and regulatory factors to weigh.",
    bodyHtml: giftCity,
  },
  {
    slug: 'global-investment-allocation',
    title: 'Global Investment Allocation: A Guide for ₹5K to ₹5L Monthly Investors',
    category: 'Allocation',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '8 min read',
    excerpt: 'How much of your portfolio should be global? Practical allocation ranges for Indian investors saving ₹5,000 to ₹5 lakh a month — factoring in goals, RSUs, currency risk, LRS, TCS, and tax reporting.',
    logo: '/articles/global-investment-allocation.jpg',
    description: 'Practical global allocation ranges for Indian investors saving ₹5,000 to ₹5 lakh per month — balancing goals, RSUs, currency risk, the LRS limit, TCS, and tax reporting.',
    bodyHtml: globalInvestmentAllocation,
  },
  {
    slug: 'routes-for-international-investing',
    title: 'Routes for International Investing: Intl MFs, ETFs, Stocks & GIFT City',
    category: 'Getting Started',
    date: '2026-06-23',
    dateLabel: 'June 2026',
    readTime: '7 min read',
    excerpt: 'Indian investors can go global through international mutual funds, US stocks, US ETFs, or GIFT City — each differing in ownership, control, taxation, and currency exposure. A side-by-side comparison.',
    logo: '/articles/routes-for-international-investing.jpg',
    description: 'A comparison of the routes Indian investors use to go global — international mutual funds, US stocks, US ETFs, and GIFT City-linked access — across ownership, control, taxation, and currency exposure.',
    bodyHtml: routesForInternationalInvesting,
  },
]

export const featuredArticles = ARTICLES.filter((a) => a.featured)

export const getArticle = (slug: string): Article | undefined =>
  ARTICLES.find((a) => a.slug === slug)
