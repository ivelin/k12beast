// File path: src/app/public/docs/[...slug]/page.tsx
// Catch-all route for /public/docs to dynamically handle all MDX files, process frontmatter for metadata, and render content.
// Loads MDX files from src/content/docs and uses remark plugins to strip comments and exclude frontmatter from rendering.

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { readFile } from "fs/promises";
import path from "path";
import remarkFrontmatter from "remark-frontmatter";
import { remove } from "unist-util-remove";

// Custom remark plugin to remove frontmatter node from the MDX content
function remarkRemoveFrontmatter() {
  return (tree: any) => {
    // Remove the frontmatter node (type: "yaml")
    const hasFrontmatter = tree.children.some((node: any) => node.type === "yaml");
    if (hasFrontmatter) {
      console.log("[remarkRemoveFrontmatter] Found and removing frontmatter (yaml) node");
      remove(tree, { type: "yaml" });
    }

    // Fallback: If frontmatter is parsed as a heading node, remove it (temporary until parsing is fixed)
    const hasFrontmatterHeading = tree.children.some(
      (node: any) =>
        node.type === "heading" &&
        node.children?.[0]?.type === "text" &&
        node.children[0].value?.includes("title:") &&
        node.children[0].value?.includes("description:") &&
        node.children[0].value?.includes("ogTitle:")
    );
    if (hasFrontmatterHeading) {
      console.log("[remarkRemoveFrontmatter] Found and removing frontmatter heading node");
      remove(tree, (node: any) => {
        if (node.type === "heading" && node.children && node.children.length > 0) {
          const child = node.children[0];
          if (
            child.type === "text" &&
            child.value &&
            child.value.includes("title:") &&
            child.value.includes("description:") &&
            child.value.includes("ogTitle:")
          ) {
            return true; // Remove this node
          }
        }
        return false;
      });
    }

    // Remove thematicBreak (---) if it exists after frontmatter removal
    const hasThematicBreak = tree.children.some((node: any) => node.type === "thematicBreak");
    if (hasThematicBreak) {
      console.log("[remarkRemoveFrontmatter] Found and removing thematicBreak node");
      remove(tree, { type: "thematicBreak" });
    }

    return tree;
  };
}

// Custom remark plugin to remove JSX comments (e.g., {/* */})
function remarkRemoveMDXComments() {
  return (tree: any) => {
    // Check for JSX comments (parsed as mdxFlowExpression nodes with value starting with "/*")
    const hasMDXFlowComments = tree.children.some(
      (node: any) => node.type === "mdxFlowExpression" && typeof node.value === "string" && node.value.trim().startsWith("/*")
    );
    if (hasMDXFlowComments) {
      console.log("[remarkRemoveMDXComments] Found and removing JSX comment (mdxFlowExpression) nodes");
      remove(tree, (node: any) => {
        if (node.type === "mdxFlowExpression") {
          if (typeof node.value === "string" && node.value.trim().startsWith("/*")) {
            return true; // Remove this node
          }
        }
        return false;
      });
    }

    // Fallback for jsx nodes (in case comments are embedded within JSX elements)
    const hasJSXComments = tree.children.some(
      (node: any) => node.type === "jsx" && typeof node.value === "string" && node.value.trim().startsWith("/*")
    );
    if (hasJSXComments) {
      console.log("[remarkRemoveMDXComments] Found and removing JSX comment (jsx) nodes");
      remove(tree, (node: any) => {
        if (node.type === "jsx") {
          if (typeof node.value === "string" && node.value.trim().startsWith("/*")) {
            return true; // Remove this node
          }
        }
        return false;
      });
    }

    return tree;
  };
}

// Interface for the expected frontmatter structure in MDX files
interface Frontmatter {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogImage?: string;
  canonical?: string;
}

// Get the MDX file path based on the slug and load its content
async function getMDXData(slug: string[]) {
  const slugPath = slug.join("/") || "/";
  console.log(`[getMDXData] Processing slug: ${slugPath}`);

  // Construct the file path from the slug
  const filePath = path.join(process.cwd(), "src/content/docs", slugPath, "page.mdx");

  console.log(`[getMDXData] Attempting to load file: ${filePath}`);

  try {
    const source = await readFile(filePath, "utf8");
    console.log(`[getMDXData] Successfully read file: ${filePath}`);

    // Compile MDX with remark plugins to strip comments and frontmatter
    const { content, frontmatter } = await compileMDX<Frontmatter>({
      source,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [
            [remarkFrontmatter, ["yaml"]], // Explicitly specify YAML frontmatter parsing
            remarkRemoveFrontmatter, // Remove frontmatter from the rendered content
            remarkRemoveMDXComments, // Remove JSX comments (e.g., {/* */})
          ],
          rehypePlugins: [],
        },
      },
    });

    console.log(`[getMDXData] Successfully processed MDX file for slug: ${slugPath}`);
    return { content, frontmatter };
  } catch (error) {
    console.error(`[getMDXData] Error loading MDX file for slug ${slugPath}:`, error);
    return null;
  }
}

// Generate metadata dynamically based on the MDX frontmatter
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const resolvedParams = await params; // Await params to resolve the Promise
  const slug = resolvedParams.slug || [];
  const slugPath = slug.join("/") || "[]";
  console.log(`[generateMetadata] Generating metadata for slug: ${slugPath}`);

  const mdxData = await getMDXData(slug);
  if (!mdxData) {
    console.log(`[generateMetadata] No MDX data found for slug: ${slugPath}, returning 404 metadata`);
    return {
      title: "Page Not Found - K12Beast Documentation",
      description: "The requested documentation page could not be found.",
    };
  }

  const { frontmatter } = mdxData;
  console.log(`[generateMetadata] Metadata generated for slug: ${slugPath}`);

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    openGraph: frontmatter.ogTitle
      ? {
          title: frontmatter.ogTitle,
          description: frontmatter.ogDescription,
          type: frontmatter.ogType || "website",
          url: frontmatter.ogUrl,
          images: frontmatter.ogImage ? [{ url: frontmatter.ogImage }] : [],
        }
      : undefined,
    alternates: frontmatter.canonical ? { canonical: frontmatter.canonical } : undefined,
  };
}

// Generate static params for known MDX files (optional, for static generation)
export async function generateStaticParams() {
  console.log("[generateStaticParams] Generating static params");

  // List of known slugs for MDX files under src/content/docs
  const slugs = [
    { slug: [] }, // For /public/docs
    { slug: ["teachers"] },
    { slug: ["parents"] },
    { slug: ["parents", "introduction"] },
    { slug: ["students"] },
    { slug: ["tutors"] },
    { slug: ["subjects"] },
    { slug: ["getting-started"] },
  ];

  console.log("[generateStaticParams] Generated slugs:", slugs);
  return slugs;
}

// Page component to render the MDX content for the given slug
export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  console.log("[DocsPage] Route handler invoked with params:", params);
  const resolvedParams = await params; // Await params to resolve the Promise
  const slug = resolvedParams.slug || [];
  const slugPath = slug.join("/") || "/";
  console.log(`[DocsPage] Rendering page for slug: ${slugPath}`);

  const mdxData = await getMDXData(slug);
  if (!mdxData) {
    console.log(`[DocsPage] No MDX data found for slug: ${slugPath}, returning 404`);
    notFound();
  }

  const { content } = mdxData;
  console.log(`[DocsPage] Successfully rendered content for slug: ${slugPath}`);

  return <div className="docs-page">{content}</div>;
}