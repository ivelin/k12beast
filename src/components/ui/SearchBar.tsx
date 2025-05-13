// File path: src/components/ui/SearchBar.tsx
// Client-side search bar for documentation pages
// Fixed search result mapping by maintaining full index data separately

'use client';
import { useState, useEffect } from 'react';
import FlexSearch from 'flexsearch';
import Link from 'next/link';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(null);
  const [fullIndexData, setFullIndexData] = useState([]); // Store full index data

  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then(data => {
        const idx = new FlexSearch.Index({ tokenize: 'full' });
        data.forEach(item => idx.add(item.id, `${item.title || ''} ${item.description || ''} ${item.content}`));
        setIndex(idx);
        setFullIndexData(data); // Store the full data separately
        setResults([]); // Initialize results as empty
      })
      .catch(() => {
        setFullIndexData([]);
        setResults([]);
      });
  }, []);

  useEffect(() => {
    if (index && query) {
      const searchResults = index.search(query);
      const filteredResults = searchResults
        .map(id => fullIndexData.find(item => item.id === id))
        .filter(item => item !== undefined); // Filter out undefined entries
      setResults(filteredResults);
    } else {
      setResults([]);
    }
  }, [query, index, fullIndexData]);

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
          {results.map(item => (
            <li key={item.id} className="p-2 hover:bg-muted">
              <Link href={item.path} className="text-foreground hover:text-primary">
                {item.title || 'Untitled Document'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}