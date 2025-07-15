import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimezoneContextType {
  timezone: string;
  loading: boolean;
  updateTimezone: (newTimezone: string) => Promise<boolean>;
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'America/Sao_Paulo',
  loading: true,
  updateTimezone: async () => false,
});

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone deve ser usado dentro de um TimezoneProvider');
  }
  return context;
};

interface TimezoneProviderProps {
  children: React.ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTimezone = async () => {
      try {
        // Primeiro tentar buscar timezone salvo no perfil do usuário
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('timezone')
            .eq('user_id', user.id)
            .single();
          
          if (!error && profile?.timezone) {
            setTimezone(profile.timezone);
            setLoading(false);
            return;
          }
        }
        
        // Se não encontrou no perfil ou usuário não autenticado, usar detecção automática
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detectedTimezone);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar timezone:', error);
        // Fallback para timezone padrão
        setTimezone('America/Sao_Paulo');
        setLoading(false);
      }
    };

    fetchUserTimezone();
  }, []);

  const updateTimezone = async (newTimezone: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return false;

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

  const value: TimezoneContextType = {
    timezone,
    loading,
    updateTimezone,
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
};