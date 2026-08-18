/**
 * The people behind Platizio Global.
 *
 * Moved out of the old TeamCarousel so the data outlives the component that
 * happened to render it first.
 */

export interface TeamMember {
  name: string
  role: string
  image: string
}

export const TEAM: readonly TeamMember[] = [
  { name: 'Aanyaa Bhardwaj', role: 'Social Media Executive', image: '/team/aanyaa-bhardwaj.jpg' },
  { name: 'Aayush Sharma', role: 'Product Software Developer', image: '/team/aayush-sharma.jpg' },
  { name: 'Anuj Pal', role: 'Senior Financial Market Analyst', image: '/team/anuj-pal.jpg' },
  { name: 'Deepika Agarwal', role: 'Financial Market Analyst', image: '/team/deepika-agarwal.jpg' },
  { name: 'Kartik Vishnani', role: 'Financial Market Analyst', image: '/team/kartik-vishnani.jpg' },
  { name: 'Kavya Khatri', role: 'Social Media Executive', image: '/team/kavya-khatri.jpg' },
  { name: 'Sumit Katyal', role: 'Product Software Developer', image: '/team/sumit-katyal.jpg' },
  { name: 'Vinayak Tyagi', role: 'Product Software Developer', image: '/team/vinayak-tyagi.jpg' },
]

/**
 * "Anuj Pal" -> "AP". Falls back to a star for a name with no Latin letters,
 * so the tile is never blank.
 */
export function initials(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '★'
  )
}
