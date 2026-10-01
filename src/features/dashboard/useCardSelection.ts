import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Auswahl einer Personen-Karte als UI-Zustand der Ansicht.
 * Ein zweiter Klick auf dieselbe Karte schließt, Escape schließt ebenfalls.
 * Beim Schließen kehrt der Fokus auf die zuletzt gewählte Karte zurück.
 */
export function useCardSelection() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());

  const close = useCallback(() => {
    if (selectedKey === null) return;
    cards.current.get(selectedKey)?.focus();
    setSelectedKey(null);
  }, [selectedKey]);

  const toggle = useCallback((key: string) => {
    setSelectedKey((current) => (current === key ? null : key));
  }, []);

  const cardRef = useCallback(
    (key: string) => (element: HTMLButtonElement | null) => {
      if (element) cards.current.set(key, element);
      else cards.current.delete(key);
    },
    [],
  );

  useEffect(() => {
    if (selectedKey === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedKey, close]);

  return { selectedKey, toggle, close, cardRef };
}
