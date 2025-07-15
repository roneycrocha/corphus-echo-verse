import React, { useState, useEffect } from 'react';
import { Menu, User, LogOut, Settings, CreditCard, Crown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCredits } from '@/hooks/useCredits';
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

/**
 * Header da aplicação com controles de usuário e notificações
 */
export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { signOut, user } = useAuthContext();
  const isMobile = useIsMobile();
  const { creditInfo } = useCredits();
  const navigate = useNavigate();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleOpenSettings = () => {
    navigate('/configuracoes');
  };

  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        {/* Controle do sidebar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Nome do usuário */}
          <div className="hidden sm:block">
            <h2 className="text-lg font-semibold text-foreground">
              Olá, {userProfile?.full_name || user?.user_metadata?.full_name || 'Usuário'}
            </h2>
            <p className="text-sm text-muted-foreground">Bem-vindo de volta!</p>
          </div>
        </div>

        {/* Controles do usuário */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Menu do usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name || user?.email} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <div className="px-3 py-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{userProfile?.full_name || user?.user_metadata?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              
              {/* Saldo */}
              <DropdownMenuItem className="cursor-default">
                <CreditCard className="mr-2 h-4 w-4 text-green-600" />
                <div className="flex flex-col">
                  <span className="text-sm">Saldo</span>
                  <span className="text-xs text-muted-foreground">{creditInfo?.balance || 0} créditos</span>
                </div>
              </DropdownMenuItem>

              {/* Plano */}
              <DropdownMenuItem className="cursor-default">
                <Crown className="mr-2 h-4 w-4 text-yellow-600" />
                <div className="flex flex-col">
                  <span className="text-sm">Plano</span>
                  <span className="text-xs text-muted-foreground">{creditInfo?.plan_type?.toUpperCase() || "BRONZE"}</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Perfil */}
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>

              {/* Configurações */}
                <DropdownMenuItem onClick={handleOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open('/manual', '_blank')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manual do Usuário
                </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialog de edição de perfil */}
      <UserProfileDialog 
        open={profileDialogOpen} 
        onOpenChange={(open) => {
          setProfileDialogOpen(open);
          if (!open) {
            // Recarregar perfil quando fechar o dialog
            loadUserProfile();
          }
        }} 
      />
    </header>
  );
};