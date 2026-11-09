import { useRef } from 'react';
/** Keeps the last non-null value so components can finish their exit animation after the store clears. */
export function useSticky<T>(v: T | null | undefined): T { const r = useRef<T | null | undefined>(v); if (v !== null && v !== undefined) r.current = v; return r.current as T; }
