// File path: src/utils/mathjax-config.ts
// Configures MathJax for MathML rendering and provides utility functions for typesetting math.
// Updated to remove script injection logic, relying on sessionUtils.ts for initialization.

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

export async function typesetMathJax() {
  if (typeof window === "undefined" || !window.MathJax) return;

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
