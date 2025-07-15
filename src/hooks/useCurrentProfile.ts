import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CurrentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  logo_url?: string;
  job_title?: string;
  role: string;
  user_type: string;
  is_active: boolean;
}

export const useCurrentProfile = () => {
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar perfil do usuário atual
  const loadCurrentProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (err: any) {
      console.error('Erro ao carregar perfil do usuário:', err);
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCurrentProfile();
    }
  }, [user]);

  return {
    profile,
    loading,
    error,
    refetch: loadCurrentProfile
  };
};