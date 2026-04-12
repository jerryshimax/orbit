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

type PageBridgeState = {
  route: string | null;
  title: string | null;
  summary: string | null;
  fields: PageField[];
  applyFieldUpdate: (name: string, value: string) => boolean;
};

type PageBridgeInternal = PageBridgeState & {
  register: (registration: {
    route: string;
    title?: string;
    summary?: string;
    fields: PageField[];
    setter: FieldSetter;
  }) => void;
  clear: (route: string) => void;
};

const PageBridgeContext = createContext<PageBridgeInternal | null>(null);

export function PageBridgeProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [fields, setFields] = useState<PageField[]>([]);
  const setterRef = useRef<FieldSetter | null>(null);

  const register = useCallback<PageBridgeInternal["register"]>((r) => {
    setRoute(r.route);
    setTitle(r.title ?? null);
    setSummary(r.summary ?? null);
    setFields(r.fields);
    setterRef.current = r.setter;
  }, []);

  const clear = useCallback<PageBridgeInternal["clear"]>((r) => {
    setRoute((current) => (current === r ? null : current));
    setTitle((t) => (route === r ? null : t));
    setSummary((s) => (route === r ? null : s));
    setFields((f) => (route === r ? [] : f));
    if (route === r) setterRef.current = null;
  }, [route]);

  const applyFieldUpdate = useCallback(
    (name: string, value: string) => {
      const field = fields.find((f) => f.name === name);
      if (!field || !setterRef.current) return false;
      setterRef.current(name, value);
      return true;
    },
    [fields]
  );

  const value = useMemo<PageBridgeInternal>(
    () => ({
      route,
      title,
      summary,
      fields,
      applyFieldUpdate,
      register,
      clear,
    }),
    [route, title, summary, fields, applyFieldUpdate, register, clear]
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
 * Registration tracks the page's route and automatically clears on unmount.
 *
 * @param route        The route the registration is for. If the current route changes,
 *                     the hook re-registers.
 * @param fields       Current state of each exposed form field.
 * @param setter       Callback invoked when Cloud applies a proposed value. Receives
 *                     (fieldName, newValue) and should update the page's state.
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
  const fieldsKey = JSON.stringify(
    opts.fields.map((f) => [f.name, f.value, f.type, f.options ?? null])
  );

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      route: opts.route,
      title: opts.title,
      summary: opts.summary,
      fields: opts.fields,
      setter: opts.setter,
    });
    return () => {
      ctx.clear(opts.route);
    };
  }, [ctx, opts.route, opts.title, opts.summary, fieldsKey, opts.setter, opts.fields]);
}
