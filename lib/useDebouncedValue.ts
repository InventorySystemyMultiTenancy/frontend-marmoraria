import { useEffect, useState } from 'react';

// Espera o valor parar de mudar antes de repassar — usado para não disparar uma
// requisição de prévia de preço a cada tecla digitada.
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
