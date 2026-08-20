import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'HAVEN - Your Safe Place to Connect',
  description: 'Ultra Secure Global Social & Communication Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HAVEN',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090b0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="min-h-screen bg-dark-950 text-dark-100 antialiased font-arabic">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
