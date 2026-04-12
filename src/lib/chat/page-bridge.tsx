"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PageFieldType = "text" | "textarea" | "select" | "number";

export type PageField = {
  name: string;
  label: string;
  type: PageFieldType;
  value: string;
  options?: string[];
  placeholder?: string;
};

type FieldSetter = (name: string, value: string) => void;

type Registration = {
  route: string;
  title: string | null;
  summary: string | null;
  fields: PageField[];
  setterRef: { current: FieldSetter };
};

type PageBridgeState = {
  route: string | null;
  title: string | null;
  summary: string | null;
  fields: PageField[];
  applyFieldUpdate: (name: string, value: string) => boolean;
};

type PageBridgeInternal = PageBridgeState & {
  register: (r: Registration) => void;
  clear: (route: string) => void;
};

const PageBridgeContext = createContext<PageBridgeInternal | null>(null);

function fieldsEqual(a: PageField[], b: PageField[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.name !== y.name ||
      x.label !== y.label ||
      x.type !== y.type ||
      x.value !== y.value ||
      x.placeholder !== y.placeholder ||
      JSON.stringify(x.options ?? null) !== JSON.stringify(y.options ?? null)
    ) {
      return false;
    }
  }
  return true;
}

export function PageBridgeProvider({ children }: { children: ReactNode }) {
  const [reg, setReg] = useState<Registration | null>(null);

  const register = useCallback<PageBridgeInternal["register"]>((next) => {
    setReg((current) => {
      if (
        current &&
        current.route === next.route &&
        current.title === next.title &&
        current.summary === next.summary &&
        current.setterRef === next.setterRef &&
        fieldsEqual(current.fields, next.fields)
      ) {
        return current;
      }
      return next;
    });
  }, []);

  const clear = useCallback<PageBridgeInternal["clear"]>((route) => {
    setReg((current) => (current?.route === route ? null : current));
  }, []);

  const applyFieldUpdate = useCallback(
    (name: string, value: string) => {
      if (!reg) return false;
      const field = reg.fields.find((f) => f.name === name);
      if (!field) return false;
      reg.setterRef.current(name, value);
      return true;
    },
    [reg]
  );

  const value = useMemo<PageBridgeInternal>(
    () => ({
      route: reg?.route ?? null,
      title: reg?.title ?? null,
      summary: reg?.summary ?? null,
      fields: reg?.fields ?? [],
      applyFieldUpdate,
      register,
      clear,
    }),
    [reg, applyFieldUpdate, register, clear]
  );

  return (
    <PageBridgeContext.Provider value={value}>
      {children}
    </PageBridgeContext.Provider>
  );
}

export function usePageBridge(): PageBridgeState {
  const ctx = useContext(PageBridgeContext);
  if (!ctx) {
    return {
      route: null,
      title: null,
      summary: null,
      fields: [],
      applyFieldUpdate: () => false,
    };
  }
  return {
    route: ctx.route,
    title: ctx.title,
    summary: ctx.summary,
    fields: ctx.fields,
    applyFieldUpdate: ctx.applyFieldUpdate,
  };
}

/**
 * Pages call this inside a client component to tell Cloud what fields are on-screen.
 *
 * The hook keeps the bridge in sync with the current field values on every render,
 * but uses an equality guard so state only commits when something actually changed —
 * no re-render storm.
 *
 * @param route        The route the registration is for. Cleared on unmount.
 * @param fields       Current state of each exposed form field.
 * @param setter       Callback invoked when Cloud applies a proposed value.
 * @param title        Optional human-readable page title for the system prompt.
 * @param summary      Optional one-line description of what the user is doing.
 */
export function useRegisterPageFields(opts: {
  route: string;
  fields: PageField[];
  setter: FieldSetter;
  title?: string;
  summary?: string;
}) {
  const ctx = useContext(PageBridgeContext);

  // Keep the latest setter in a stable ref so the bridge can invoke it
  // without triggering a re-register every time the parent re-renders.
  const setterRef = useRef(opts.setter);
  setterRef.current = opts.setter;
  const setterRefRef = useRef(setterRef);

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      route: opts.route,
      title: opts.title ?? null,
      summary: opts.summary ?? null,
      fields: opts.fields,
      setterRef: setterRefRef.current,
    });
  });

  useEffect(() => {
    if (!ctx) return;
    return () => {
      ctx.clear(opts.route);
    };
  }, [ctx, opts.route]);
}
