// src/components/ui/formatted-timestamp.tsx
"use client";

import { useMemo } from "react";

interface FormattedTimestampProps {
  timestamp: string;
  format?: "full" | "short"; // Allow different formats
}

export default function FormattedTimestamp({
  timestamp,
  format = "full",
}: FormattedTimestampProps) {
  const formatted = useMemo(() => {
    try {
      // Normalize the UTC timestamp to ensure proper parsing
      const normalizedTimestamp = timestamp.includes("Z")
        ? timestamp
        : `${timestamp.replace(/(\.\d+)?$/, "")}Z`;
      const date = new Date(normalizedTimestamp);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid timestamp");
      }
      const options: Intl.DateTimeFormatOptions = {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      if (format === "full") {
        options.second = "numeric";
        options.timeZoneName = "short";
      }
      return date.toLocaleString("en-US", {
        ...options,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use browser's timezone
      });
    } catch {
      return "Invalid timestamp";
    }
  }, [timestamp, format]);

  return <span>{formatted}</span>;
}