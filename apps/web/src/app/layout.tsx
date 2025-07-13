import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { TRPCProvider } from '@/components/providers/trpc-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Phonoglyph - MIDI Visualization Platform',
  description: 'Transform MIDI files into stunning visual experiences',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          {children}
          <Toaster />
          <div id="modal-portal-root" />
        </TRPCProvider>
      </body>
    </html>
  )
} 