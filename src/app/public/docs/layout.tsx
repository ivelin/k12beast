// src/app/public/docs/layout.tsx
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