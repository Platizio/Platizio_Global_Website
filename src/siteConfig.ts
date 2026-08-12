// Single source of truth for site-wide identity and SEO defaults.
//
// Previously BASE_URL was declared separately in SEO.tsx and ArticlePage.tsx,
// and the org details lived only in index.html's JSON-LD. Both the runtime
// components and the build-time scripts (prerender, sitemap) read from here,
// so a domain or handle change is a one-line edit.

export const SITE_URL = 'https://platizioglobal.com'
export const SITE_NAME = 'Platizio Global'
export const SITE_LOCALE = 'en_IN'

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
export const DEFAULT_OG_IMAGE_ALT =
  'Platizio Global — invest in US Stocks and ETFs from India'

export const LOGO_URL = `${SITE_URL}/logo.png`

export const SUPPORT_EMAIL = 'supportglobal@platizio.com'
export const SUPPORT_PHONE = '+91-92898-37100'

export const SOCIAL = {
  youtube: 'https://www.youtube.com/@platizioglobal',
  instagram: 'https://www.instagram.com/platizioglobal/',
  x: 'https://x.com/platizioglobal',
} as const

/** Twitter handle for twitter:site — must include the leading @ */
export const TWITTER_HANDLE = '@platizioglobal'

/** Absolute-ise a path that may already be absolute. */
export const absoluteUrl = (pathOrUrl: string): string =>
  pathOrUrl.startsWith('http') ? pathOrUrl : `${SITE_URL}${pathOrUrl}`
