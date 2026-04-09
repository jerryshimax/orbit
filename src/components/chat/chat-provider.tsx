"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ChatContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
};

const ChatContext = createContext<ChatContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
});

export function useChatPanel() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle: () => setIsOpen((o) => !o),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
