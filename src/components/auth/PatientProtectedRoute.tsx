import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface PatientProtectedRouteProps {
  children: React.ReactNode;
}

export const PatientProtectedRoute: React.FC<PatientProtectedRouteProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPatient, setIsPatient] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthState = async (session: any) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('user_id', session.user.id)
            .single();

          if (error) {
            console.error('Erro ao verificar tipo de usuário:', error);
            setIsPatient(false);
          } else {
            setIsPatient(profile?.user_type === 'patient');
          }
        } catch (error) {
          console.error('Erro ao verificar perfil:', error);
          setIsPatient(false);
        }
      } else {
        setIsPatient(null);
      }
      
      setLoading(false);
    };

    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        checkAuthState(session);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/patient-login" replace />;
  }

  if (isPatient === false) {
    // Usuário logado mas não é paciente
    return <Navigate to="/patient-login" replace />;
  }

  if (isPatient === null) {
    // Ainda carregando dados do perfil
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};