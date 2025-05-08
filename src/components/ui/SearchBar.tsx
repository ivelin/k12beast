// src/components/ui/SearchBar.tsx
// File path: src/components/ui/SearchBar.tsx
// Client-side search bar for documentation, styled with Tailwind CSS
'use client';
import { useState, useEffect } from 'react';
import FlexSearch from 'flexsearch';
import Link from 'next/link';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [index, setIndex] = useState<FlexSearch.Index | null>(null);

  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then(data => {
        const idx = new FlexSearch.Index({ tokenize: 'full' });
        data.forEach((item: any) => idx.add(item.id, `${item.title} ${item.description} ${item.content}`));
        setIndex(idx);
      });
  }, []);

  useEffect(() => {
    if (index && query) {
      const searchResults = index.search(query);
      setResults(searchResults.map((id: string) => index.find((item: any) => item.id === id)));
    } else {
      setResults([]);
    }
  }, [query, index]);

  return (
    <div className="mb-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search documentation..."
        className="w-full p-2 border rounded message-input"
      />
      {results.length > 0 && (
        <ul className="mt-2 border rounded bg-background">
          {results.map((item: any) => (
            <li key={item.id} className="p-2 hover:bg-muted">
              <Link href={item.path} className="text-foreground hover:text-primary">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}