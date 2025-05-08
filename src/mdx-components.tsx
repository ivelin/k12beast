// File path: src/mdx-components.tsx
// Configures MDX component rendering for Next.js App Router
// Resolves createContext error by providing a custom MDX components handler

import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Allows customization of MDX components (e.g., styling headings)
    // Example: h1: ({ children }) => <h1 className="text-3xl">{children}</h1>,
    ...components,
  };
}