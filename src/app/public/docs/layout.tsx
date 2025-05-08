// File path: app/public/docs/layout.tsx
// Nested layout for K12Beast documentation pages, integrating with root layout
// Ensures responsive design, consistent styling, and navigation for docs
// Reuses Tailwind CSS classes from globals.css for light/dark mode support
// Includes DocsSidebar for navigation and SearchBar for content search

import { ReactNode } from 'react';
import DocsSidebar from '@/components/ui/DocsSidebar';
import SearchBar from '@/components/ui/SearchBar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DocsSidebar />
      <main className="flex-1 p-2 sm:p-4 sm:max-w-5xl sm:mx-auto">
        <SearchBar />
        {children}
      </main>
    </div>
  );
}