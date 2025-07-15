import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';

export const useTimezone = () => {
  const { user } = useAuthContext();
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTimezone = async () => {
      if (!user?.id) {
        // Detectar timezone automaticamente se não houver usuário
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detectedTimezone);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (profile?.timezone) {
          setTimezone(profile.timezone);
        } else {
          // Se não houver timezone definido, usar o timezone detectado automaticamente
          const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(detectedTimezone);
        }
      } catch (error) {
        console.error('Erro ao buscar timezone do usuário:', error);
        // Fallback para timezone detectado automaticamente
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detectedTimezone);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTimezone();
  }, [user?.id]);

  const updateTimezone = async (newTimezone: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone: newTimezone })
        .eq('user_id', user.id);

      if (error) throw error;

      setTimezone(newTimezone);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar timezone:', error);
      return false;
    }
  };

  return {
    timezone,
    loading,
    updateTimezone,
    setTimezone
  };
};