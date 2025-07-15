import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  DollarSign, 
  Calendar, 
  FileText, 
  Settings,
  Stethoscope,
  BarChart3,
  Monitor,
  Package,
  Crown,
  Coins,
  X
} from 'lucide-react';
import corphusIcon from '@/assets/corphus-icon.png';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissions } from '@/hooks/usePermissions';

interface SidebarProps {
  isCollapsed?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'Pacientes', href: '/pacientes', icon: Users },
  { name: 'Prontuário', href: '/prontuario', icon: FileText },
  { name: 'Monitor', href: '/monitor', icon: Monitor },
  { name: 'Monitor Terapêutica', href: '/gestao-terapeutica', icon: Stethoscope },
  { name: 'Análise Corporal', href: '/analise-corporal', icon: Activity },
  { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { name: 'Indicadores', href: '/indicadores', icon: BarChart3 },
];

/**
 * Sidebar principal do corphus.ai
 * Navegação entre os módulos da plataforma
 */
export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed = false, 
  isOpen = false, 
  onClose 
}) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAdmin } = usePermissions();

  // Fechar sidebar quando clicar em um link no mobile
  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Fechar sidebar com ESC no mobile
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && isOpen && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isOpen, onClose]);

  // No mobile, mostrar overlay quando aberto
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={onClose}
          />
        )}
        
        {/* Sidebar Mobile */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Header com botão fechar */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={corphusIcon} alt="Corphus.ai" className="w-8 h-8" />
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-primary truncate">corphus.ai</h1>
                <p className="text-xs text-muted-foreground">Análise Terapêutica</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navegação Mobile */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Configurações Mobile */}
          <div className="p-4 border-t border-border space-y-2">
            <NavLink
              to="/configuracoes"
              onClick={handleNavClick}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="text-base">Configurações</span>
            </NavLink>
            
            {/* Gestão de Créditos - Só para Administradores */}
            {isAdmin && (
              <NavLink
                to="/gestao-creditos"
                onClick={handleNavClick}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
              >
                <Coins className="w-5 h-5 flex-shrink-0" />
                <span className="text-base">Gestão de Créditos</span>
              </NavLink>
            )}
            
            {/* Gestão de Pacotes - Só para Administradores */}
            {isAdmin && (
              <NavLink
                to="/gestao-pacotes"
                onClick={handleNavClick}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
              >
                <Package className="w-5 h-5 flex-shrink-0" />
                <span className="text-base">Gestão de Pacotes</span>
              </NavLink>
            )}
            
            {/* Gestão de Planos - Só para Administradores */}
            {isAdmin && (
              <NavLink
                to="/gestao-planos"
                onClick={handleNavClick}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
              >
                <Crown className="w-5 h-5 flex-shrink-0" />
                <span className="text-base">Gestão de Planos</span>
              </NavLink>
            )}
          </div>
        </div>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className={cn(
      "bg-card border-r border-border h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo Desktop */}
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <img src={corphusIcon} alt="Corphus.ai" className="w-8 h-8" />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-primary truncate">corphus.ai</h1>
              <p className="text-xs text-muted-foreground">Análise Terapêutica</p>
            </div>
          )}
        </div>
      </div>

      {/* Navegação Desktop */}
      <nav className="flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 sm:py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary font-medium shadow-sm"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate text-sm sm:text-base">{item.name}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Configurações Desktop */}
      <div className="p-2 sm:p-4 border-t border-border space-y-1 sm:space-y-2">
        <NavLink
          to="/configuracoes"
          className="flex items-center space-x-3 px-3 py-2 sm:py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm sm:text-base">Configurações</span>}
        </NavLink>
        
        {/* Gestão de Créditos - Só para Administradores */}
        {isAdmin && (
          <NavLink
            to="/gestao-creditos"
            className="flex items-center space-x-3 px-3 py-2 sm:py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
          >
            <Coins className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm sm:text-base">Gestão de Créditos</span>}
          </NavLink>
        )}
        
        {/* Gestão de Pacotes - Só para Administradores */}
        {isAdmin && (
          <NavLink
            to="/gestao-pacotes"
            className="flex items-center space-x-3 px-3 py-2 sm:py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm sm:text-base">Gestão de Pacotes</span>}
          </NavLink>
        )}
        
        {/* Gestão de Planos - Só para Administradores */}
        {isAdmin && (
          <NavLink
            to="/gestao-planos"
            className="flex items-center space-x-3 px-3 py-2 sm:py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors duration-200"
          >
            <Crown className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm sm:text-base">Gestão de Planos</span>}
          </NavLink>
        )}
      </div>
    </div>
  );
};