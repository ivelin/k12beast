// File path: src/utils/mathjax-config.ts
// Configures MathJax for MathML rendering and provides utility functions for typesetting math.

import type { MathJaxObject } from "mathjax-full/js/mathjax";

declare global {
  interface Window {
    MathJax: MathJaxObject & {
      startup: {
        promise: Promise<void>;
      };
      typesetPromise: () => Promise<void>;
    };
  }
}

let mathJaxLoadedPromise: Promise<void> | null = null;

export function initializeMathJax() {
  if (typeof window === "undefined" || window.MathJax) return;

  window.MathJax = {
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      ignoreHtmlClass: "mathml-ignore",
    },
    startup: {
      typeset: false,
    },
    chtml: {
      scale: 1,
    },
  };

  mathJaxLoadedPromise = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/mml-chtml.js";
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      console.error("Failed to load MathJax script");
      resolve(); // Resolve anyway to avoid blocking, but log the error
    };
    document.head.appendChild(script);
  });
}

export async function typesetMathJax() {
  if (typeof window === "undefined" || !window.MathJax) return;

  // Wait for MathJax to load if it hasn't yet
  if (mathJaxLoadedPromise) {
    await mathJaxLoadedPromise;
  }

  // Check if MathJax startup is ready
  if (window.MathJax.startup && window.MathJax.startup.promise) {
    try {
      await window.MathJax.startup.promise;
      await window.MathJax.typesetPromise();
    } catch (error) {
      console.error("MathJax typesetting failed:", error);
    }
  } else {
    console.warn("MathJax startup.promise is not available yet");
  }
}