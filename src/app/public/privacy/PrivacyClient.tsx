// File path: src/app/public/privacy/PrivacyClient.tsx
// Client component for K12Beast privacy page, displaying privacy policy content

"use client";

import Link from "next/link";

export default function PrivacyClient() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[90vw] sm:max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">K12Beast Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">
        At K12Beast, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your data.
      </p>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Data Collection</h2>
        <p className="text-muted-foreground">
          We collect your email and usage data to provide personalized tutoring services. Data is stored securely and not shared with third parties.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
        <p className="text-muted-foreground">
          For privacy-related questions, contact us at{" "}
          <a href="mailto:support@k12beast.com" className="text-primary hover:underline">
            support@k12beast.com
          </a>
          .
        </p>
      </section>
      <Link href="/" className="text-primary hover:underline">
        Back to Home
      </Link>
    </div>
  );
}