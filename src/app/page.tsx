// File path: src/app/page.tsx
// Server component for K12Beast home page, handling SEO and structured data
// Renders HomeClient for interactive UI

import { Metadata } from 'next';
import HomeClient from './HomeClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'K12Beast - Personalized Tutoring for K-12 Students',
  description: 'K12Beast offers AI-powered tutoring with tailored lessons, examples, and quizzes for K-12 students.',
  openGraph: {
    title: 'K12Beast - Personalized Tutoring for K-12 Students',
    description: 'K12Beast offers AI-powered tutoring with tailored lessons, examples, and quizzes for K-12 students.',
    type: 'article',
    url: 'https://k12beast.com/',
    images: ['https://k12beast.com/images/home.png'],
  },
};

// Define Article JSON-LD for rich results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Unleash Your K12Beast: Personalized Tutoring for K-12 Success',
  description: 'Discover how K12Beast uses AI to deliver tailored lessons, quizzes, and progress tracking for K-12 students.',
  datePublished: '2025-01-01T00:00:00Z',
  author: { '@type': 'Organization', name: 'zk0 DBA' },
  publisher: {
    '@type': 'Organization',
    name: 'zk0 DBA',
    logo: { '@type': 'ImageObject', url: 'https://k12beast.com/images/logo.png' },
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}