import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext({ isOpen: false, setIsOpen: () => {} });

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);

export default SidebarContext;
