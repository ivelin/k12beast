// File path: src/app/public/privacy/page.tsx
// Server component for K12Beast privacy page, handling SEO and structured data
// Renders PrivacyClient for privacy policy content

import { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'K12Beast Privacy Policy',
  description: 'Read K12Beast’s privacy policy to understand how we protect your data and privacy.',
  openGraph: {
    title: 'K12Beast Privacy Policy',
    description: 'Read K12Beast’s privacy policy to understand how we protect your data and privacy.',
    type: 'website',
    url: 'https://k12beast.com/public/privacy',
    images: ['https://k12beast.com/images/privacy.png'],
  },
};

// Define WebPage JSON-LD for structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'K12Beast Privacy Policy',
  description: 'Privacy policy outlining how K12Beast collects, uses, and protects user data.',
  url: 'https://k12beast.com/public/privacy',
};

export default function Privacy() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PrivacyClient />
    </>
  );
}