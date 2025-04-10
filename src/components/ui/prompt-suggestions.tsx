// src/components/ui/prompt-suggestions.tsx
interface PromptSuggestionsProps {
  label: string
  append: (message: { role: "user"; content: string }) => void
  suggestions: string[]
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
}: PromptSuggestionsProps) {
  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-4">
      <h2 className="text-center text-2xl font-bold">{label}</h2>
      <div className="flex flex-col gap-4 text-sm sm:flex-row sm:gap-6">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => append({ role: "user", content: suggestion })}
            className="w-full sm:flex-1 rounded-xl border bg-background p-4 text-left hover:bg-muted break-words"
          >
            <p>{suggestion}</p>
          </button>
        ))}
      </div>
    </div>
  );
}