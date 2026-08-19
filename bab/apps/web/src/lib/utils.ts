import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '0%'
  return `${Math.round(score * 100)}%`
}

export function getCategoryLabel(category: string | null | undefined): string {
  switch (category) {
    case 'very_similar': return 'Very Similar'
    case 'similar': return 'Similar'
    case 'possible': return 'Possible Match'
    case 'low': return 'Low Similarity'
    default: return 'Unknown'
  }
}

export function getCategoryBadgeClass(category: string | null | undefined): string {
  switch (category) {
    case 'very_similar': return 'badge-very-similar'
    case 'similar': return 'badge-similar'
    case 'possible': return 'badge-possible'
    case 'low': return 'badge-low'
    default: return 'badge-low'
  }
}

export function getSourceTypeIcon(type: string | null | undefined): string {
  switch (type) {
    case 'social': return 'Users'
    case 'news': return 'Newspaper'
    case 'forum': return 'MessageCircle'
    case 'image': return 'Image'
    default: return 'Globe'
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}
