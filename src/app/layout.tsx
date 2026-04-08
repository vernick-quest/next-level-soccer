import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next Level Soccer SF | Development Camps',
  description:
    'Next Level Soccer Development Camps at Beach Chalet for competitive middle school club players. High-intensity technical, tactical, and physical training.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
