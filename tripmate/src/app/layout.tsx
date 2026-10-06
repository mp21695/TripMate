import type { Metadata } from 'next';
import { Cormorant_Garamond, Geist, Space_Mono } from 'next/font/google';
import './globals.css';
import { TripProvider } from '@/context/TripContext';
import { SmoothScroll } from '@/components/providers/SmoothScroll';

const cormorant = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const spaceMono = Space_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'TripMate — Beyond Places, Into Moments',
  description: 'A dark, widescreen collaborative travel platform designed for group expeditions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${cormorant.variable} ${spaceMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#08090a] text-[#f5f4ef] selection:bg-[#3d444d] selection:text-white">
        <SmoothScroll>
          <TripProvider>
            {children}
          </TripProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
