import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthProvider';

interface PatientRedirectWrapperProps {
  children: React.ReactNode;
}

export const PatientRedirectWrapper: React.FC<PatientRedirectWrapperProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserType = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar tipo de usuário:', error);
          setUserType('therapist'); // Default para terapeuta se houver erro
        } else {
          setUserType(profile?.user_type || 'therapist');
        }
      } catch (error) {
        console.error('Erro ao verificar tipo de usuário:', error);
        setUserType('therapist'); // Default para terapeuta se houver erro
      } finally {
        setLoading(false);
      }
    };

    checkUserType();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se for paciente, redireciona para o monitor
  if (userType === 'patient') {
    return <Navigate to="/monitor" replace />;
  }

  // Se for terapeuta, permite acesso às rotas
  return <>{children}</>;
};