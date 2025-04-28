// File path: src/hooks/use-auto-scroll.ts
// Hook to auto-scroll to the bottom of a chat container

import { useEffect, useRef, useState } from "react";

const ACTIVATION_THRESHOLD = 50;
const MIN_SCROLL_UP_THRESHOLD = 10;

interface UseAutoScrollOptions {
  messagesLength: number; // Example dependency passed to the hook
}

export function useAutoScroll({ messagesLength }: UseAutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousScrollTop = useRef<number | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
    const isScrollingUp = previousScrollTop.current !== null && scrollTop < previousScrollTop.current;
    const scrollUpDistance = previousScrollTop.current !== null ? previousScrollTop.current - scrollTop : 0;

    const isDeliberateScrollUp = isScrollingUp && scrollUpDistance > MIN_SCROLL_UP_THRESHOLD;
    if (isDeliberateScrollUp) {
      setShouldAutoScroll(false);
    } else {
      setShouldAutoScroll(distanceFromBottom < ACTIVATION_THRESHOLD);
    }
    previousScrollTop.current = scrollTop;
  };

  const handleTouchStart = () => {
    setShouldAutoScroll(false);
  };

  useEffect(() => {
    if (containerRef.current) {
      previousScrollTop.current = containerRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    if (shouldAutoScroll) scrollToBottom();
  }, [messagesLength, shouldAutoScroll]); // Explicitly list dependencies

  return {
    containerRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  };
}