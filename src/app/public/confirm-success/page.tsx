// File path: src/app/public/confirm-success/page.tsx
// Server component for K12Beast confirm success page, handling SEO and structured data
// Renders ConfirmSuccessClient for confirmation message

import { Metadata } from 'next';
import ConfirmSuccessClient from './ConfirmSuccessClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'Account Confirmed - K12Beast',
  description: 'Your K12Beast account has been activated. Log in to access personalized tutoring for K-12 students.',
  openGraph: {
    title: 'Account Confirmed - K12Beast',
    description: 'Your K12Beast account has been activated. Log in to access personalized tutoring for K-12 students.',
    type: 'website',
    url: 'https://k12beast.com/public/confirm-success',
    images: ['https://k12beast.com/images/confirm-success.png'],
  },
};

// Define WebPage JSON-LD for structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'K12Beast Account Confirmation',
  description: 'Confirmation page for successfully activating your K12Beast account.',
  url: 'https://k12beast.com/public/confirm-success',
};

export default function ConfirmSuccess() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ConfirmSuccessClient />
    </>
  );
}