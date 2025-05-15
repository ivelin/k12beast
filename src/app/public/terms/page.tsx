// File path: src/app/public/terms/page.tsx
// Server component for K12Beast terms page, handling SEO and structured data
// Renders TermsClient for terms of service content

import { Metadata } from 'next';
import TermsClient from './TermsClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'Terms of Service - K12Beast',
  description: 'Read the Terms of Service for using K12Beast, a personalized tutoring platform for K-12 students.',
  openGraph: {
    title: 'Terms of Service - K12Beast',
    description: 'Read the Terms of Service for using K12Beast, a personalized tutoring platform for K-12 students.',
    type: 'website',
    url: 'https://k12beast.com/public/terms',
    images: ['https://k12beast.com/images/terms.png'],
  },
};

// Define WebPage JSON-LD for structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'K12Beast Terms of Service',
  description: 'Terms of Service governing the use of K12Beast’s tutoring platform.',
  url: 'https://k12beast.com/public/terms',
};

export default function Terms() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TermsClient />
    </>
  );
}