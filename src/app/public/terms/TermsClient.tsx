// File path: src/app/public/terms/TermsClient.tsx
// Client component for K12Beast terms page, displaying terms of service

"use client";

import Link from "next/link";

export default function TermsClient() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[90vw] sm:max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-4 text-muted-foreground">
        Welcome to K12Beast. By using our platform, you agree to these Terms of Service, which govern your access to and use of our AI-powered tutoring services.
      </p>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">
          By accessing or using K12Beast, you agree to be bound by these terms and our{" "}
          <Link href="/public/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, please do not use our services.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">2. Use of Services</h2>
        <p className="text-muted-foreground">
          K12Beast provides personalized tutoring for K-12 students. You may not use our services for any unlawful purpose or in violation of these terms.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">3. Contact</h2>
        <p className="text-muted-foreground">
          For questions about these terms, contact us at{" "}
          <a href="mailto:support@k12beast.com" className="text-primary hover:underline">
            support@k12beast.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}