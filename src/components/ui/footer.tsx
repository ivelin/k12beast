// File path: src/components/ui/footer.tsx
// Reusable Footer component with links to Terms, Privacy, and About pages

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-100 py-4 w-full mt-auto">
      <nav className="container mx-auto px-4 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
        <Link href="/public/terms" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/public/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <Link href="/public/about" className="hover:underline">
          About
        </Link>
      </nav>
    </footer>
  );
}