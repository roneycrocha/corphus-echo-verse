import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout principal da aplicação corphus.ai
 * Inclui sidebar, header e área de conteúdo
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop sempre visível, Mobile overlay */}
      {!isMobile && <Sidebar isCollapsed={sidebarCollapsed} />}
      {isMobile && (
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={handleCloseSidebar}
        />
      )}
      
      <div className={`flex-1 flex flex-col ${isMobile ? 'w-full' : ''}`}>
        <Header 
          onToggleSidebar={handleToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};