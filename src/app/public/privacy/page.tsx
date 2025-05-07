// File path: src/app/public/privacy/page.tsx
// Privacy Policy page for K12Beast, outlining data handling practices

import Link from "next/link";

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[90vw] sm:max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">K12Beast Privacy Policy</h1>
      <p className="mb-4 text-muted-foreground">
        At K12Beast, we prioritize your privacy. This Privacy Policy explains how
        we collect, use, and protect your personal information when you use our
        application.
      </p>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
        <p className="text-muted-foreground">
          We collect:
        </p>
        <ul className="list-disc ml-6 text-muted-foreground">
          <li>
            <strong>Student Data</strong>: Progress, quiz results, and lesson
            interactions to personalize tutoring.
          </li>
          <li>
            <strong>Account Information</strong>: Names, email addresses, or other
            details provided during registration.
          </li>
          <li>
            <strong>Usage Data</strong>: Information on how you interact with the
            app to improve our services.
          </li>
        </ul>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">
          We use your data to:
        </p>
        <ul className="list-disc ml-6 text-muted-foreground">
          <li>Provide personalized educational content.</li>
          <li>Improve app functionality and user experience.</li>
          <li>Comply with legal obligations.</li>
        </ul>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">3. Sharing Your Information</h2>
        <p className="text-muted-foreground">
          We may share data with:
        </p>
        <ul className="list-disc ml-6 text-muted-foreground">
          <li>
            <strong>xAI</strong>: To generate educational content, subject to xAI’s{" "}
            <a
              href="https://x.ai/legal/privacy-policy"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Service Providers</strong>: For hosting, analytics, or other
            operational needs, under strict confidentiality agreements.
          </li>
          <li>
            <strong>Legal Authorities</strong>: If required by law or to protect
            our rights.
          </li>
        </ul>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">4. Children’s Privacy</h2>
        <p className="text-muted-foreground">
          K12Beast is designed for K-12 students, including those under 13. We
          comply with the Children’s Online Privacy Protection Act (COPPA):
        </p>
        <ul className="list-disc ml-6 text-muted-foreground">
          <li>Users under 13 require parental or legal guardian consent.</li>
          <li>
            Parents may contact us at{" "}
            <a
              href="mailto:support@k12beast.com"
              className="text-primary hover:underline"
            >
              support@k12beast.com
            </a>{" "}
            to review or delete their child’s data.
          </li>
          <li>
            We do not knowingly collect data from children under 13 without
            consent.
          </li>
        </ul>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
        <p className="text-muted-foreground">
          You may:
        </p>
        <ul className="list-disc ml-6 text-muted-foreground">
          <li>
            Access, correct, or delete your data by contacting us at{" "}
            <a
              href="mailto:support@k12beast.com"
              className="text-primary hover:underline"
            >
              support@k12beast.com
            </a>
            .
          </li>
          <li>Opt out of certain data collection, where applicable.</li>
        </ul>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">6. Data Security</h2>
        <p className="text-muted-foreground">
          We implement reasonable measures to protect your data but cannot
          guarantee absolute security.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">7. Changes to This Policy</h2>
        <p className="text-muted-foreground">
          We may update this Privacy Policy. Continued use of K12Beast after
          changes constitutes acceptance of the new policy. See our{" "}
          <Link href="/public/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          for more details.
        </p>
      </section>
    </div>
  );
}