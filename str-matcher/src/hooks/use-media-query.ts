import { useState, useEffect } from 'react';

// Заранее определенные брейкпоинты
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

type Breakpoint = keyof typeof breakpoints;

function getMediaQuery(breakpoint: string) {
  return `(min-width: ${breakpoint})`;
}

export function useMediaQuery(breakpoint: Breakpoint | string) {
  const query = getMediaQuery(breakpoints[breakpoint as Breakpoint] || breakpoint);
  const [matches, setMatches] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    
    if (typeof window === 'undefined') return;
    
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  // На сервере всегда возвращаем false
  if (!hasMounted) return false;

  return matches;
}

// Хук для работы с мобильными устройствами
export function useIsMobile() {
  return !useMediaQuery('md');
}

// Хук для получения текущего брейкпоинта
export function useCurrentBreakpoint() {
  const is2xl = useMediaQuery('2xl');
  const isXl = useMediaQuery('xl');
  const isLg = useMediaQuery('lg');
  const isMd = useMediaQuery('md');
  const isSm = useMediaQuery('sm');

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

// Хук для работы с ориентацией устройства
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOrientation = () => {
      if (window.matchMedia("(orientation: portrait)").matches) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}
