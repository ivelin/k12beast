// File path: src/app/public/docs/layout.tsx
// Layout for documentation pages with CSS-only mobile menu toggle, search bar, and CTA

import { ReactNode } from 'react';
import DocsSidebar from '@/components/ui/DocsSidebar';
import SearchBar from '@/components/ui/SearchBar';
import CallToAction from '@/components/ui/CallToAction';
import { Menu } from 'lucide-react';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <input type="checkbox" id="menu-toggle" className="hidden peer" />
      <DocsSidebar />
      <main className="flex-1 p-2 sm:p-4 sm:max-w-5xl sm:mx-auto">
        <div className="flex justify-between items-center mb-4 md:hidden">
          <label
            htmlFor="menu-toggle"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium
              hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-offset-2
              focus-visible:ring-ring outline-none h-9 w-9"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </label>
        </div>
        <SearchBar />
        {children}
        <CallToAction />
      </main>
    </div>
  );
}