// File path: src/app/public/login/page.tsx
// Server component for K12Beast login page, handling SEO and structured data
// Renders LoginClient for authentication flows

import { Metadata } from 'next';
import LoginClient from './LoginClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'Login to K12Beast',
  description: 'Log in to K12Beast to access personalized tutoring for K-12 students. Sign up or reset your password if needed.',
  openGraph: {
    title: 'Login to K12Beast',
    description: 'Log in to K12Beast to access personalized tutoring for K-12 students. Sign up or reset your password if needed.',
    type: 'website',
    url: 'https://k12beast.com/public/login',
    images: ['https://k12beast.com/images/login.png'],
  },
};

// Define HowTo JSON-LD for rich results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Log In to K12Beast',
  description: 'Follow these steps to log in to K12Beast and start your tutoring session.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Enter Email',
      text: 'Input your registered email address in the email field.',
    },
    {
      '@type': 'HowToStep',
      name: 'Enter Password',
      text: 'Input your password in the password field. Click the eye icon to toggle visibility.',
    },
    {
      '@type': 'HowToStep',
      name: 'Submit Form',
      text: 'Click the "Log In" button to access your account. If you forgot your password, click "Forgot Password?" to reset it.',
    },
  ],
};

export default function Login() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LoginClient />
    </>
  );
}