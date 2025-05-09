// File path: src/components/ui/DocsSidebar.tsx
// Sidebar navigation for documentation pages with mobile toggle support

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const menu = [
  {
    title: 'Parents',
    path: '/public/docs/parents',
    children: [{ title: 'Introduction', path: '/public/docs/parents/introduction' }],
  },
  {
    title: 'Students',
    path: '/public/docs/students',
    children: [{ title: 'Math', path: '/public/docs/students/math' }],
  },
  {
    title: 'Teachers',
    path: '/public/docs/teachers',
    children: [{ title: 'Classroom Guide', path: '/public/docs/teachers/classroom' }],
  },
  {
    title: 'Tutors',
    path: '/public/docs/tutors',
    children: [{ title: 'Tutoring Guide', path: '/public/docs/tutors/guide' }],
  },
  {
    title: 'Subjects',
    path: '/public/docs/subjects',
    children: [{ title: 'Algebra', path: '/public/docs/subjects/algebra' }],
  },
  {
    title: 'Getting Started',
    path: '/public/docs/getting-started',
    children: [],
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-muted p-4 hidden md:block peer-checked:block">
      <nav>
        {menu.map((section) => (
          <Collapsible
            key={section.title}
            defaultOpen={pathname.startsWith(section.path)}
            className="mb-2"
          >
            <CollapsibleTrigger
              className="flex items-center justify-between w-full text-lg font-semibold
                text-foreground hover:text-primary"
            >
              <Link href={section.path}>{section.title}</Link>
              {section.children.length > 0 && <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            {section.children.length > 0 && (
              <CollapsibleContent>
                <ul className="ml-4 mt-2">
                  {section.children.map((item) => (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        className={`block py-1 text-foreground hover:text-primary
                          ${pathname === item.path ? 'font-bold' : ''}`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            )}
          </Collapsible>
        ))}
      </nav>
    </aside>
  );
}