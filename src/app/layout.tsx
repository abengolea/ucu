import type { Metadata } from 'next';
import { Archivo, Literata } from 'next/font/google';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  DEFAULT_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: '%s — UCU',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: 'Usuarios y Consumidores Unidos', url: getSiteUrl() }],
  creator: 'Usuarios y Consumidores Unidos',
  publisher: 'Usuarios y Consumidores Unidos',
  category: 'Defensa del consumidor',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: getSiteUrl(),
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: absoluteUrl('/brand/logo-ucu.png'),
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_TAGLINE,
    images: [absoluteUrl('/brand/logo-ucu.png')],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/brand/favicon.png',
    apple: '/brand/favicon.png',
  },
  other: {
    'geo.region': 'AR',
    'geo.placename': 'Argentina',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className={`${archivo.variable} ${literata.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        {children}
      </body>
    </html>
  );
}
