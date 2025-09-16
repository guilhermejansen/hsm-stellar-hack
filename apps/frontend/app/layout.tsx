import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/context/query-provider';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Stellar Custody',
    template: '%s | Stellar Custody',
  },
  description: 'Multi-Signature Custody System for Stellar Blockchain with HSM Integration',
  keywords: [
    'Stellar',
    'Custody',
    'Multi-Signature',
    'HSM DINAMO',
    'Blockchain',
    'Security',
    'TOTP',
    'Guardian',
    'Enterprise',
  ],
  authors: [
    {
      name: 'Guilherme Jansen',
    },
    { 
      name: 'Alexandre Gomes',
    }
  ],
  creator: 'Stellar Custody',
  publisher: 'Stellar Custody',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <div className="relative flex min-h-screen flex-col">
                <div className="flex-1">{children}</div>
              </div>
              <Toaster
                position="top-right"
                closeButton
                richColors
                expand={false}
                visibleToasts={5}
                toastOptions={{
                  duration: 4000,
                  unstyled: false,
                  classNames: {
                    toast: 'rounded-lg shadow-lg border backdrop-blur-sm min-w-[320px] max-w-[450px] cursor-pointer hover:shadow-xl transition-shadow duration-200',
                    title: 'font-medium text-sm pr-8',
                    description: 'text-sm opacity-90 mt-1',
                    actionButton: 'rounded-md px-3 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors',
                    cancelButton: 'rounded-md px-3 py-1 text-xs font-medium opacity-70 hover:opacity-100 bg-white/10 hover:bg-white/20 transition-all',
                    closeButton: 'opacity-50 hover:opacity-100 transition-opacity duration-200 absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 dark:hover:bg-black/20 w-5 h-5 flex items-center justify-center text-xs',
                    error: 'border-red-200/50 dark:border-red-800/50 bg-gradient-to-r from-red-50/90 to-red-100/90 dark:from-red-950/90 dark:to-red-900/90 text-red-900 dark:text-red-100',
                    success: 'border-green-200/50 dark:border-green-800/50 bg-gradient-to-r from-green-50/90 to-green-100/90 dark:from-green-950/90 dark:to-green-900/90 text-green-900 dark:text-green-100',
                    warning: 'border-yellow-200/50 dark:border-yellow-800/50 bg-gradient-to-r from-yellow-50/90 to-yellow-100/90 dark:from-yellow-950/90 dark:to-yellow-900/90 text-yellow-900 dark:text-yellow-100',
                    info: 'border-stellar-200/50 dark:border-stellar-800/50 bg-gradient-to-r from-stellar-50/90 to-stellar-100/90 dark:from-stellar-950/90 dark:to-stellar-900/90 text-stellar-900 dark:text-stellar-100',
                    default: 'border-corporate-200/50 dark:border-corporate-700/50 bg-gradient-to-r from-white/90 to-corporate-50/90 dark:from-corporate-900/90 dark:to-corporate-800/90 text-corporate-900 dark:text-corporate-100',
                  },
                  style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}