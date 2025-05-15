// File path: src/app/public/about/page.tsx
// Server component for K12Beast about page, handling SEO and structured data
// Renders AboutClient for static content

import { Metadata } from 'next';
import AboutClient from './AboutClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'About K12Beast',
  description: 'Learn about K12Beast, a personalized tutoring app for K-12 students, parents, and educators.',
  openGraph: {
    title: 'About K12Beast',
    description: 'Learn about K12Beast, a personalized tutoring app for K-12 students, parents, and educators.',
    type: 'website',
    url: 'https://k12beast.com/public/about',
    images: ['https://k12beast.com/images/about.png'],
  },
};

// Define FAQPage JSON-LD for rich results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is K12Beast?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'K12Beast is a personalized tutoring platform for K-12 students, using AI to deliver tailored lessons, examples, and quizzes.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is K12Beast open-source?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, K12Beast is open-source under the Apache License 2.0. Explore or contribute on our GitHub repository.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I contact K12Beast?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Reach out to us at support@k12beast.com for any questions or support.',
      },
    },
  ],
};

export default function About() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutClient />
    </>
  );
}