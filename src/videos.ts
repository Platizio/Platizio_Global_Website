export interface Video {
  /** YouTube video id — also used to build the thumbnail URL */
  id: string
  /** Display title (tidied from the YouTube title — no hashtags) */
  title: string
  /** Canonical watch URL — /shorts/ for shorts, youtu.be for long-form */
  url: string
  /** ISO date the video was published on the channel */
  date: string
  /** 1-2 sentence summary, used by the Home page "Latest" card */
  blurb: string
}

// Order = display order, newest first. Mirrors the @platizioglobal channel.
export const VIDEOS: Video[] = [
  {
    id: 'CKtJHoKmNBI',
    title: 'The Future of Investing Is Global',
    url: 'https://youtube.com/shorts/CKtJHoKmNBI',
    date: '2026-07-28',
    blurb:
      'Global companies, overseas investing, currency movements and wealth diversification — why international markets are becoming part of long-term portfolio thinking for Indian investors.',
  },
  {
    id: '6uTyQZgBWw0',
    title: 'Global ETFs: Markets, Sectors and Themes in One Investment',
    url: 'https://youtu.be/6uTyQZgBWw0',
    date: '2026-07-24',
    blurb:
      'What Global ETFs are, how passive and active ETFs differ, and how a single ETF can give exposure to entire markets, sectors, countries or themes.',
  },
  {
    id: 'wRQik3jjm-w',
    title: 'Various Routes for International Investing',
    url: 'https://youtu.be/wRQik3jjm-w',
    date: '2026-07-08',
    blurb:
      'Before choosing a product, investors need to understand the route. A look at how Indians can invest outside India, with a focus on the GIFT City ecosystem.',
  },
  {
    id: 'vknYWqWU8-g',
    title: 'The AI Chip Story Is Not Over Yet',
    url: 'https://youtube.com/shorts/vknYWqWU8-g',
    date: '2026-06-26',
    blurb:
      'Chip stocks sold off sharply on AI-spending doubts, then Micron reported strong earnings. What one-day corrections mean for investors tracking semiconductor ETFs.',
  },
  {
    id: 'pske1BeHNDM',
    title: 'How Tax Works in Global Investing',
    url: 'https://youtu.be/pske1BeHNDM',
    date: '2026-06-25',
    blurb:
      'Capital gains, US dividend withholding, the Foreign Tax Credit and foreign-asset reporting — the tax side of US Stocks and ETFs in simple language.',
  },
  {
    id: '0Ege3_bYC0Y',
    title: 'Introducing Platizio Global — Your Gateway to International Investing',
    url: 'https://youtu.be/0Ege3_bYC0Y',
    date: '2026-06-24',
    blurb:
      'A focused way for Indian investors to explore Global Stocks and ETFs through the GIFT City route, and track markets, watchlists, portfolios and orders in one place.',
  },
  {
    id: 'OGTdv3ZSXoY',
    title: 'Currency Risk in Global Investing, Explained in a Minute',
    url: 'https://youtube.com/shorts/OGTdv3ZSXoY',
    date: '2026-06-23',
    blurb:
      'Salary, savings and investments sit in rupees, but education, travel and technology costs track the dollar. Why currency diversification matters.',
  },
  {
    id: '71MGWFpYOcI',
    title: 'Why Indian Investors Need Global Investing',
    url: 'https://youtu.be/71MGWFpYOcI',
    date: '2026-06-19',
    blurb:
      'India can remain the core of your portfolio. Global investing adds another layer of diversification and reduces dependence on one country, market cycle and currency.',
  },
  {
    id: '_xUeqs5hhvg',
    title: 'Global Diversification Explained Easily',
    url: 'https://youtube.com/shorts/_xUeqs5hhvg',
    date: '2026-06-17',
    blurb:
      'Owning 100 stocks still leaves single-country risk if they are all Indian. Why spreading across countries, currencies and sectors builds a more balanced portfolio.',
  },
]

/** Newest video on the channel — featured on the Home page. */
export const LATEST_VIDEO = VIDEOS[0]
