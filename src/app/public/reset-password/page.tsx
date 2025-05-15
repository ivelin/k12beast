// File path: src/app/public/reset-password/page.tsx
// Server component for K12Beast reset password page, handling SEO and structured data
// Renders ResetPasswordClient for password reset flow

import { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';

// Define SEO metadata for the page
export const metadata: Metadata = {
  title: 'Reset Password for K12Beast',
  description: 'Reset your K12Beast password to regain access to personalized tutoring for K-12 students.',
  openGraph: {
    title: 'Reset Password for K12Beast',
    description: 'Reset your K12Beast password to regain access to personalized tutoring for K-12 students.',
    type: 'website',
    url: 'https://k12beast.com/public/reset-password',
    images: ['https://k12beast.com/images/reset-password.png'],
  },
};

// Define HowTo JSON-LD for rich results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Reset Your K12Beast Password',
  description: 'Follow these steps to reset your K12Beast password using a recovery link.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Enter New Password',
      text: 'Input your new password in the new password field. Click the eye icon to toggle visibility.',
    },
    {
      '@type': 'HowToStep',
      name: 'Confirm Password',
      text: 'Input the same password in the confirm password field to verify it matches.',
    },
    {
      '@type': 'HowToStep',
      name: 'Submit Form',
      text: 'Click the "Reset Password" button to update your password. You’ll be redirected to login.',
    },
  ],
};

export default function ResetPassword() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResetPasswordClient />
    </>
  );
}