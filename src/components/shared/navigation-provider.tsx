"use client";

import { createContext, useContext, useState, useCallback } from "react";

type NavigationContextType = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
};

const NavigationContext = createContext<NavigationContextType>({
  isSidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
  isCollapsed: false,
  toggleCollapsed: () => {},
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleCollapsed = useCallback(() => setIsCollapsed((v) => !v), []);

  return (
    <NavigationContext.Provider
      value={{ isSidebarOpen, toggleSidebar, closeSidebar, isCollapsed, toggleCollapsed }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
