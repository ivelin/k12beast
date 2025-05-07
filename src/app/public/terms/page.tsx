// File path: src/app/public/terms/page.tsx
// Terms of Service page for K12Beast, outlining user agreement

import Link from "next/link";

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[90vw] sm:max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">K12Beast Terms of Service</h1>
      <p className="mb-4 text-muted-foreground">
        Welcome to K12Beast! These Terms of Service govern your use of our
        application. By accessing or using K12Beast, you agree to be bound by
        these terms. If you do not agree, please do not use our service.
      </p>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">
          By using K12Beast, you agree to these Terms of Service and any updates
          we may post.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
        <p className="text-muted-foreground">
          K12Beast is a personalized tutoring application for K-12 students.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">3. User Conduct</h2>
        <p className="text-muted-foreground">
          You agree to use K12Beast responsibly, in accordance with our
          Acceptable Use Policy.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">4. Intellectual Property</h2>
        <p className="text-muted-foreground">
          All content is owned by K12Beast or its licensors, including xAI.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">5. Privacy</h2>
        <p className="text-muted-foreground">
          See our{" "}
          <Link href="/public/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">6. Use of xAI Services</h2>
        <p className="text-muted-foreground">
          K12Beast uses xAI services. You agree to xAI’s{" "}
          <a
            href="https://x.ai/legal/terms-of-service"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://x.ai/legal/privacy-policy"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">7. Minors</h2>
        <p className="text-muted-foreground">
          Users under 13 must have parental consent.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">8. Termination</h2>
        <p className="text-muted-foreground">
          We may suspend or terminate access at any time.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">9. Disclaimer of Warranties</h2>
        <p className="text-muted-foreground">
          K12Beast is provided “as is” without warranties.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">10. Limitation of Liability</h2>
        <p className="text-muted-foreground">
          We are not liable for indirect or consequential damages.
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">11. Governing Law</h2>
        <p className="text-muted-foreground">
          These terms are governed by the laws of Texas.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">12. Changes to Terms</h2>
        <p className="text-muted-foreground">
          We may update these terms. Continued use constitutes acceptance.
        </p>
      </section>
    </div>
  );
}