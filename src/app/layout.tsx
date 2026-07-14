import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';

export const metadata: Metadata = {
  title: 'Tabs POS - Tablet Distribution & Inventory',
  description: 'Premium tablet inventory, supplier ledger, QC checking, transfers, and real-time IMEI locator system.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tabs POS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to set the theme before rendering to prevent flashing */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
