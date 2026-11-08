import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type MouseEvent } from 'react';

type RouterCtx = { path: string; navigate: (to: string) => void; back: () => void };
const Ctx = createContext<RouterCtx>({ path: '/', navigate: () => {}, back: () => {} });

const readHash = () => {
  try {
    const h = window.location.hash.replace(/^#/, '');
    return h.startsWith('/') ? h : '/';
  } catch {
    return '/';
  }
};

/** Tiny hash router: keeps the app dependency-free and works when hosted as a static file. */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(readHash);
  const [stack, setStack] = useState<string[]>([]);

  useEffect(() => {
    const on = () => setPath(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const navigate = useCallback(
    (to: string) => {
      setStack((s) => [...s.slice(-30), path]);
      setPath(to);
      try {
        if (window.location.hash !== '#' + to) window.history.pushState(null, '', '#' + to);
      } catch {
        /* sandboxed: in-memory routing still works */
      }
      try {
        window.scrollTo({ top: 0 });
      } catch {
        /* noop */
      }
    },
    [path],
  );

  const back = useCallback(() => {
    setStack((s) => {
      const prev = s[s.length - 1] ?? (path.startsWith('/provider') ? '/provider' : '/');
      setPath(prev);
      try {
        window.history.replaceState(null, '', '#' + prev);
        window.scrollTo({ top: 0 });
      } catch {
        /* noop */
      }
      return s.slice(0, -1);
    });
  }, [path]);

  const value = useMemo(() => ({ path, navigate, back }), [path, navigate, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);

/** Match "/exp/:id" style patterns. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('?')[0].split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function Link({ to, className, children, onClick, ...rest }: { to: string; className?: string; children: ReactNode; onClick?: () => void; 'aria-label'?: string; title?: string }) {
  const { navigate } = useRouter();
  return (
    <a
      href={'#' + to}
      className={className}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
