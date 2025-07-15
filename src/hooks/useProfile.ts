import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  logo_url?: string;
  public_email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  website?: string;
  job_title?: string;
  address?: any;
  role: string;
  user_type: string;
  is_active: boolean;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar um perfil de terapeuta ativo para exibir na landing page
  const loadTherapistProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'therapist')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data);
    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTherapistProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    refetch: loadTherapistProfile
  };
};