// src/utils/mathjax-config.ts
export function initializeMathJax() {
  if (typeof window === "undefined" || (window as any).MathJax) return;

  (window as any).MathJax = {
    tex: {
      inlineMath: [["$", "$"]],
      displayMath: [["$$", "$$"]],
      packages: ["base", "ams", "mhchem"],
    },
    loader: {
      load: ["[tex]/mhchem"],
    },
    startup: {
      typeset: false,
    },
  };

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
  script.async = true;
  document.head.appendChild(script);
}

export function typesetMathJax() {
  if (typeof window === "undefined" || !(window as any).MathJax) return;
  (window as any).MathJax.startup.promise = (window as any).MathJax.startup.promise
    .then(() => (window as any).MathJax.typesetPromise())
    .catch((err: any) => console.error("MathJax typesetting failed:", err));
}