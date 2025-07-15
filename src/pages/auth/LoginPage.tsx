import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Activity, ArrowRight, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { supabase } from '@/integrations/supabase/client';

/**
 * Página de login do corphus.ai
 * Interface de autenticação para terapeutas
 */
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, isAuthenticated } = useAuthContext();

  // Redirect se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Iniciando cadastro com dados:', { email, fullName });
      const { error } = await signUp(email, password, fullName);
      
      console.log('Resposta do signup:', { error });
      
      if (error) {
        console.error('Erro no signup:', error);
        toast.error(`Erro: ${error}`);
      } else {
        toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
        // Não redirecionar automaticamente - aguardar confirmação manual
      }
    } catch (error: any) {
      console.error('Erro capturado no catch:', error);
      toast.error(`Erro ao criar conta: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setMode('login');
      }
    } catch (error) {
      toast.error('Erro ao enviar email de recuperação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFormConfig = () => {
    switch (mode) {
      case 'signup':
        return {
          title: 'Criar conta gratuita',
          description: 'Comece seu teste gratuito agora',
          submitText: 'Criar conta',
          onSubmit: handleSignUp
        };
      case 'reset':
        return {
          title: 'Recuperar senha',
          description: 'Digite seu email para receber o link de recuperação',
          submitText: 'Enviar email',
          onSubmit: handleResetPassword
        };
      default:
        return {
          title: 'Entre na sua conta',
          description: 'Acesse sua plataforma de análise terapêutica',
          submitText: 'Entrar',
          onSubmit: handleLogin
        };
    }
  };

  const formConfig = getFormConfig();

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Seção de branding */}
        <div className="hidden lg:block text-white space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">corphus.ai</h1>
                <p className="text-white/80">Análise Terapêutica Inteligente</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Transforme sua prática terapêutica com IA
            </h2>
            <p className="text-xl text-white/90 leading-relaxed">
              Análise corporal avançada, gestão completa de pacientes e relatórios inteligentes 
              para terapeutas que buscam excelência no atendimento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-semibold mb-2">+10.000</h3>
              <p className="text-white/80 text-sm">Sessões analisadas</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-semibold mb-2">98%</h3>
              <p className="text-white/80 text-sm">Satisfação</p>
            </div>
          </div>
        </div>

        {/* Formulário dinâmico */}
        <Card className="w-full max-w-md mx-auto shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="lg:hidden flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">corphus.ai</span>
            </div>
            
            <CardTitle className="text-2xl font-bold">{formConfig.title}</CardTitle>
            <CardDescription>
              {formConfig.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            <form onSubmit={formConfig.onSubmit} className="space-y-4">
              {/* Campo Nome (apenas no cadastro) */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 pl-10"
                      required
                    />
                    <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Campo Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                    required
                  />
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Campo Senha (não mostrar na recuperação) */}
              {mode !== 'reset' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-10"
                      minLength={6}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Opções do login */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-input" />
                    <span className="text-muted-foreground">Lembrar de mim</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {/* Botão de envio */}
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      {mode === 'signup' ? 'Criando conta...' : 
                       mode === 'reset' ? 'Enviando email...' : 'Entrando...'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{formConfig.submitText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>


            {/* Navegação entre modos */}
            <div className="space-y-4">
              {mode === 'login' && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Não tem conta?{' '}
                    <button
                      onClick={() => setMode('signup')}
                      className="text-primary font-medium hover:underline"
                    >
                      Crie sua conta agora!
                    </button>
                  </p>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>Ao realizar o pagamento terá acesso imediato</p>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Já tem uma conta?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className="text-primary font-medium hover:underline"
                    >
                      Entre aqui
                    </button>
                  </p>
                </div>
              )}

              {mode === 'reset' && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Lembrou da senha?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className="text-primary font-medium hover:underline"
                    >
                      Voltar ao login
                    </button>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};