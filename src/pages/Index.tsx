import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Calendar,
  BarChart3,
  Shield,
  Heart,
  Zap,
  PlayCircle,
  MessageCircle,
  Brain,
  Target,
  Award,
  TrendingUp,
  Clock,
  Smartphone,
  Instagram,
  Facebook,
  Linkedin
} from 'lucide-react';
import corphusIcon from '@/assets/corphus-icon.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/auth/AuthProvider';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthContext();

  console.log('[Index] Componente renderizado');
  console.log('[Index] URL atual:', window.location.href);
  console.log('[Index] User:', user);
  console.log('[Index] Loading:', loading);

  // Não redirecionar automaticamente - deixar o usuário escolher
  // A landing page deve sempre ser acessível para visitantes
  return (
    <div className="min-h-screen bg-background">
      {/* Debug info - remover depois */}
      <div className="fixed top-0 right-0 bg-red-500 text-white p-2 text-xs z-50">
        Index Renderizada - {new Date().toLocaleTimeString()}
      </div>
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <img src={corphusIcon} alt="Corphus.ai" className="w-8 h-8" />
              <span className="text-xl font-bold text-primary">corphus.ai</span>
            </div>
            <div className="hidden md:flex space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                Funcionalidades
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">
                Planos
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">
                Depoimentos
              </a>
            </div>
            <div className="flex space-x-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/patient-login">
                <Button size="sm">
                  Área do Paciente
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">
                  ✨ Plataforma Completa de Gestão Terapêutica
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                  Transforme sua
                  <span className="text-primary"> prática terapêutica</span> 
                  com tecnologia
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Sistema completo para fisioterapeutas e profissionais da saúde gerenciarem 
                  pacientes, análises corporais, financeiro e muito mais em uma plataforma integrada.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link to="/login">
                    <Button size="lg" className="text-lg px-8 py-6 h-auto">
                      <PlayCircle className="w-6 h-6 mr-3" />
                      Começar Gratuitamente
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto">
                    <Calendar className="w-6 h-6 mr-3" />
                    Agendar Demonstração
                  </Button>
                </div>
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Teste grátis 14 dias
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Sem cartão de crédito
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Suporte especializado
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border">
                  <img 
                    src={`https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&h=400&fit=crop`}
                    alt="Dashboard da plataforma"
                    className="w-full h-80 object-cover rounded-lg"
                  />
                  <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium">
                    100% Online
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Profissionais Ativos</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10k+</div>
              <div className="text-muted-foreground">Pacientes Atendidos</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50k+</div>
              <div className="text-muted-foreground">Análises Realizadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Satisfação dos Usuários</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Funcionalidades Principais
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Tudo que você precisa em uma plataforma
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Gerencie toda sua prática terapêutica com ferramentas profissionais 
              desenvolvidas especificamente para profissionais da saúde.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <Card className="hover:shadow-lg transition-all duration-300 border-primary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Análise Corporal IA</h3>
                <p className="text-muted-foreground mb-4">
                  Sistema avançado de análise corporal com inteligência artificial para 
                  avaliações precisas e relatórios detalhados.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Análise postural automatizada
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Relatórios personalizados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Comparação de evoluções
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-primary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Agenda Inteligente</h3>
                <p className="text-muted-foreground mb-4">
                  Sistema completo de agendamento com notificações automáticas 
                  e integração com videoconferência.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Agendamento online
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Lembretes automáticos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Teleconsultas integradas
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-primary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Gestão Financeira</h3>
                <p className="text-muted-foreground mb-4">
                  Controle completo das finanças com relatórios detalhados, 
                  fluxo de caixa e análise de receitas.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Controle de recebimentos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Relatórios em PDF
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Dashboard financeiro
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Gestão Terapêutica</h4>
                <p className="text-sm text-muted-foreground">
                  Planos de tratamento personalizados com acompanhamento de evolução.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Gestão de Pacientes</h4>
                <p className="text-sm text-muted-foreground">
                  Cadastro completo com histórico médico e documentos digitais.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Comunicação Integrada</h4>
                <p className="text-sm text-muted-foreground">
                  WhatsApp, email e notificações automáticas para pacientes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">App Mobile</h4>
                <p className="text-sm text-muted-foreground">
                  Acesso completo via dispositivos móveis para maior flexibilidade.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Segurança LGPD</h4>
                <p className="text-sm text-muted-foreground">
                  Compliance total com LGPD e proteção avançada de dados.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Analytics Avançado</h4>
                <p className="text-sm text-muted-foreground">
                  Métricas e indicadores para otimizar sua prática profissional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Como Funciona
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Simples e rápido de começar
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Em poucos minutos você estará usando todas as funcionalidades da plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Cadastre-se</h3>
              <p className="text-muted-foreground">
                Crie sua conta gratuita em menos de 2 minutos. 
                Sem burocracias ou taxas de setup.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Configure</h3>
              <p className="text-muted-foreground">
                Personalize sua agenda, cadastre pacientes e configure 
                suas preferências de atendimento.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Comece a usar</h3>
              <p className="text-muted-foreground">
                Inicie seus atendimentos, análises corporais e gestão 
                financeira imediatamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Planos e Preços
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Escolha o plano ideal para você
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Planos flexíveis para profissionais individuais ou clínicas completas.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Bronze Plan */}
            <Card className="relative hover:shadow-xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Bronze</h3>
                  <p className="text-muted-foreground mb-6">Ideal para começar</p>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">R$ 97</div>
                    <div className="text-sm text-muted-foreground">/mês</div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">R$ 970</div>
                      <div className="text-xs text-muted-foreground">anual (2 meses grátis)</div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Até 50 pacientes
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Agenda básica
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Prontuário digital
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Relatórios básicos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Suporte por email
                  </li>
                </ul>
                <Link to="/login" className="block">
                  <Button className="w-full" variant="outline">
                    Começar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Silver Plan - Most Popular */}
            <Card className="relative hover:shadow-xl transition-all duration-300 border-primary scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white px-4 py-1">
                  Mais Popular
                </Badge>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Silver</h3>
                  <p className="text-muted-foreground mb-6">Para profissionais ativos</p>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">R$ 197</div>
                    <div className="text-sm text-muted-foreground">/mês</div>
                    <div className="bg-primary/10 p-2 rounded-lg border border-primary">
                      <div className="text-2xl font-bold text-primary">R$ 1.970</div>
                      <div className="text-xs text-muted-foreground">anual (2 meses grátis)</div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Até 150 pacientes
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Agenda avançada + teleconsulta
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Análise corporal IA
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Gestão financeira completa
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Relatórios avançados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Integração WhatsApp
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Suporte prioritário
                  </li>
                </ul>
                <Link to="/login" className="block">
                  <Button className="w-full">
                    Começar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Gold Plan */}
            <Card className="relative hover:shadow-xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Gold</h3>
                  <p className="text-muted-foreground mb-6">Para clínicas e equipes</p>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">R$ 397</div>
                    <div className="text-sm text-muted-foreground">/mês</div>
                    <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">R$ 3.970</div>
                      <div className="text-xs text-muted-foreground">anual (2 meses grátis)</div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Pacientes ilimitados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Múltiplos terapeutas
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Gestão de equipe
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Analytics avançado
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    API personalizada
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Customização completa
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    Suporte dedicado
                  </li>
                </ul>
                <Link to="/login" className="block">
                  <Button className="w-full" variant="outline">
                    Começar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Todos os planos incluem 14 dias de teste gratuito. 
              Sem compromisso, cancele quando quiser.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Dados seguros e protegidos
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Atualizações gratuitas
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Treinamento incluso
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Depoimentos
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Mais de 500 profissionais já transformaram suas práticas com nossa plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "O Corphus revolucionou minha clínica. A análise corporal com IA 
                  me permite fazer avaliações muito mais precisas e os pacientes 
                  ficam impressionados com os relatórios."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-primary">MR</span>
                  </div>
                  <div>
                    <div className="font-semibold">Dra. Maria Rodriguez</div>
                    <div className="text-sm text-muted-foreground">Fisioterapeuta - SP</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "A gestão financeira integrada me deu total controle sobre minha 
                  prática. Agora sei exatamente como está meu faturamento e 
                  posso tomar decisões mais assertivas."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-primary">JS</span>
                  </div>
                  <div>
                    <div className="font-semibold">Dr. João Silva</div>
                    <div className="text-sm text-muted-foreground">Osteopata - RJ</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "Nossa clínica cresceu 40% depois que começamos a usar o Corphus. 
                  O sistema de agendamento online facilitou muito para nossos 
                  pacientes e melhorou nossa organização."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="font-bold text-primary">AC</span>
                  </div>
                  <div>
                    <div className="font-semibold">Ana Costa</div>
                    <div className="text-sm text-muted-foreground">Diretora Clínica - MG</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Pronto para transformar sua prática?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a centenas de profissionais que já estão usando o Corphus 
              para otimizar seus atendimentos e aumentar seus resultados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/login">
                <Button size="lg" className="text-lg px-8 py-6 h-auto">
                  <PlayCircle className="w-6 h-6 mr-3" />
                  Começar Teste Gratuito
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto">
                <Calendar className="w-6 h-6 mr-3" />
                Agendar Demonstração
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                14 dias grátis
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Sem cartão de crédito
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Suporte gratuito
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <img src={corphusIcon} alt="Corphus.ai" className="w-8 h-8" />
                <span className="text-xl font-bold text-primary">corphus.ai</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Plataforma completa para gestão de práticas terapêuticas e 
                atendimento de pacientes.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-primary">Preços</a></li>
                <li><a href="#" className="hover:text-primary">Integrações</a></li>
                <li><a href="#" className="hover:text-primary">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-primary">Treinamentos</a></li>
                <li><a href="#" className="hover:text-primary">Status</a></li>
                <li><a href="#" className="hover:text-primary">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Sobre nós</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Carreiras</a></li>
                <li><a href="#" className="hover:text-primary">Imprensa</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-muted-foreground">
                © 2024 Corphus. Todos os direitos reservados.
              </p>
              <div className="flex space-x-4 mt-4 md:mt-0 text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary">Privacidade</a>
                <a href="#" className="hover:text-primary">Termos</a>
                <a href="#" className="hover:text-primary">LGPD</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;