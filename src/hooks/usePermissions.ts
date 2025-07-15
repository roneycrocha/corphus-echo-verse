import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'specialist' | 'secretary' | 'assistant';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = async (permissionName: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        user_uuid: user.id,
        permission_name: permissionName
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return userProfile ? roles.includes(userProfile.role) : false;
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isSpecialist = (): boolean => {
    return hasRole('specialist');
  };

  const canManageUsers = (): boolean => {
    return hasAnyRole(['admin']);
  };

  const canManageFinances = (): boolean => {
    return hasAnyRole(['admin', 'specialist', 'secretary']);
  };

  const canViewReports = (): boolean => {
    return hasAnyRole(['admin', 'specialist']);
  };

  const canEditTransactions = (): boolean => {
    return hasAnyRole(['admin', 'specialist', 'secretary']);
  };

  const canDeleteTransactions = (): boolean => {
    return hasAnyRole(['admin', 'specialist']);
  };

  const canManagePatients = (): boolean => {
    return hasAnyRole(['admin', 'specialist', 'secretary']);
  };

  const canManageSettings = (): boolean => {
    return hasAnyRole(['admin']);
  };

  return {
    userProfile,
    loading,
    hasPermission,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSpecialist,
    canManageUsers,
    canManageFinances,
    canViewReports,
    canEditTransactions,
    canDeleteTransactions,
    canManagePatients,
    canManageSettings,
    refetch: fetchUserProfile
  };
};