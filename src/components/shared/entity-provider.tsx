"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type EntityCode = "All" | "CE" | "SYN" | "UUL" | "FO";

type EntityContextType = {
  entity: EntityCode;
  setEntity: (entity: EntityCode) => void;
  /** The entity code to pass to API calls — undefined when "All" */
  entityParam: string | undefined;
};

const EntityContext = createContext<EntityContextType>({
  entity: "All",
  setEntity: () => {},
  entityParam: undefined,
});

export function EntityProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get("entity");
  const entity: EntityCode =
    raw === "CE" || raw === "SYN" || raw === "UUL" || raw === "FO"
      ? raw
      : "All";

  const setEntity = useCallback(
    (next: EntityCode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "All") {
        params.delete("entity");
      } else {
        params.set("entity", next);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const entityParam = entity === "All" ? undefined : entity;

  return (
    <EntityContext.Provider value={{ entity, setEntity, entityParam }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
