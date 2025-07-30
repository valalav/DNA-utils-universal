import { useRef, useEffect, useState, useMemo } from 'react';

interface VirtualizationOptions {
  items: any[];
  rowHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
  item: any;
}

export function useVirtualization({ 
  items, 
  rowHeight, 
  overscan = 3 
}: VirtualizationOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    
    const handleScroll = () => {
      if (container) {
        setScrollTop(container.scrollTop);
        setIsScrolling(true);

        if (scrollingTimeoutRef.current) {
          clearTimeout(scrollingTimeoutRef.current);
        }

        scrollingTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150) as unknown as NodeJS.Timeout;
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (!viewportHeight) return [];

    const startIndex = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(items.length, startIndex + visibleCount + overscan);

    return Array.from({ length: end - start }, (_, index) => {
      const virtualIndex = start + index;
      return {
        index: virtualIndex,
        start: virtualIndex * rowHeight,
        size: rowHeight,
        item: items[virtualIndex]
      };
    });
  }, [items, viewportHeight, scrollTop, rowHeight, overscan]);

  const totalSize = items.length * rowHeight;
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = Math.max(0, totalSize - (paddingTop + virtualItems.length * rowHeight));

  return {
    containerRef,
    virtualItems,
    totalSize,
    paddingTop,
    paddingBottom,
    isScrolling
  };
}