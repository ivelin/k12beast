// File path: src/components/ui/prompt-suggestions.tsx
// Renders a list of prompt suggestions for K12Beast chat
// Updated to support disabled prop for preventing actions during quiz or loading

interface PromptSuggestionsProps {
  label: string;
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
  className?: string; // Added className prop to match usage in page.tsx
  disabled?: boolean; // Added disabled prop
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
  className,
  disabled = false, // Default to false
}: PromptSuggestionsProps) {
  return (
    <div className={`space-y-6 w-full max-w-5xl mx-auto px-4 ${className || ""}`}>
      <h2 className="text-center text-2xl font-bold">{label}</h2>
      <div className="flex flex-col gap-4 text-sm sm:flex-row sm:gap-6">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => append({ role: "user", content: suggestion })}
            disabled={disabled}
            className="w-full sm:flex-1 rounded-xl border bg-background p-4 text-left hover:bg-muted break-words disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p>{suggestion}</p>
          </button>
        ))}
      </div>
    </div>
  );
}