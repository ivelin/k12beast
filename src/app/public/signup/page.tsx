// File path: src/app/public/signup/page.tsx
// Server component for K12Beast signup page, handling SEO and structured data
// Renders SignupClient for authentication flow

import { Metadata } from 'next';
import SignupClient from './SignupClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'Sign Up for K12Beast',
  description: 'Create a K12Beast account to access personalized tutoring for K-12 students.',
  openGraph: {
    title: 'Sign Up for K12Beast',
    description: 'Create a K12Beast account to access personalized tutoring for K-12 students.',
    type: 'website',
    url: 'https://k12beast.com/public/signup',
    images: ['https://k12beast.com/images/signup.png'],
  },
};

// Define HowTo JSON-LD for rich results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Sign Up for K12Beast',
  description: 'Follow these steps to create a K12Beast account and start your tutoring journey.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Enter Email',
      text: 'Input your email address in the email field.',
    },
    {
      '@type': 'HowToStep',
      name: 'Enter Password',
      text: 'Input a secure password in the password field. Click the eye icon to toggle visibility.',
    },
    {
      '@type': 'HowToStep',
      name: 'Submit Form',
      text: 'Click the "Sign Up" button to create your account. Check your email for a confirmation link.',
    },
  ],
};

export default function Signup() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SignupClient />
    </>
  );
}