import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { LoginPage } from "./pages/auth/LoginPage";
import { PatientLoginPage } from "./pages/auth/PatientLoginPage";
import { PatientSignupPage } from "./pages/auth/PatientSignupPage";
import { PatientRegistrationPage } from "./pages/patient-registration/PatientRegistrationPage";
import { PatientBookingPage } from "./pages/patient-booking/PatientBookingPage";
import Index from "./pages/Index";
import TherapistProfile from "./pages/TherapistProfile";
import { Dashboard } from "./pages/Dashboard";
import { AnaliseCorporalPage } from "./pages/analise-corporal/AnaliseCorporalPage";
import { DetailedAnalysisPage } from "./pages/analise-corporal/DetailedAnalysisPage";
import { SimplifiedAnalysisPage } from "./pages/analise-corporal/SimplifiedAnalysisPage";
import { FinanceiroPage } from "./pages/financeiro/FinanceiroPage";
import { PlanoContasPage } from "./pages/financeiro/PlanoContasPage";
import { IndicadoresPage } from "./pages/indicadores/IndicadoresPage";
import { GestaoTerapeuticaPage } from "./pages/gestao-terapeutica/GestaoTerapeuticaPage";
import { AgendaPage } from "./pages/agenda/AgendaPage";
import { ProntuarioPage } from "./pages/prontuario/ProntuarioPage";
import { PacientesPage } from "./pages/pacientes/PacientesPage";
import { CadastrarPacientePage } from "./pages/pacientes/CadastarPacientePage";
import { MonitorPage } from "./pages/monitor/MonitorPage";
import NotFound from "./pages/NotFound";
import { ConfiguracoesPage } from "./pages/configuracoes/ConfiguracoesPage";
import { GestaoPacotesPage } from "./pages/gestao-pacotes/GestaoPacotesPage";
import { GestaoCreditosPage } from "./pages/gestao-creditos/GestaoCreditosPage";
import { GestaPlanosPage } from "./pages/gestao-planos/GestaPlanosPage";
import { VideoCallPublicPage } from "./pages/video-call/VideoCallPublicPage";
import { VideoCallTestPage } from "./pages/video-call/VideoCallTestPage";
import { VideoCallPage } from "./pages/video-call/VideoCallPageNew";
import DailyCallPage from "./pages/video-call/DailyCallPage";
import DailyPatientPage from "./pages/video-call/DailyPatientPage";
import DailyVideoCallPage from "./pages/video-call/DailyVideoCallPage";
import { AIAssistancePage } from "./pages/video-call/AIAssistancePage";
import { BasicAppointmentPage } from "./pages/basic-appointment/BasicAppointmentPage";
import { ManualPage } from "./pages/ManualPage";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PatientProtectedRoute } from "./components/auth/PatientProtectedRoute";
import { PatientRedirectWrapper } from "./components/auth/PatientRedirectWrapper";
import { SubscriptionProtection } from "./components/auth/SubscriptionProtection";
import { SubscriptionPlansPage } from "./pages/subscription/SubscriptionPlansPage";
import { SubscriptionSuccessPage } from "./pages/subscription/SubscriptionSuccessPage";

import { TimezoneProvider } from "./contexts/TimezoneContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TimezoneProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/terapeuta/:userId" element={<TherapistProfile />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/patient-login" element={<PatientLoginPage />} />
              <Route path="/patient-signup" element={<PatientSignupPage />} />
              <Route path="/patient-registration/:token" element={<PatientRegistrationPage />} />
              <Route path="/patient-booking/:token" element={<PatientBookingPage />} />
              <Route path="/manual" element={<ManualPage />} />
              <Route path="/daily-patient/:encodedData" element={<DailyPatientPage />} />
              <Route path="/video-call/:callId" element={<VideoCallPublicPage />} />
              <Route path="/video-test" element={<VideoCallTestPage />} />
              
              {/* Rotas de assinatura */}
              <Route path="/subscription-plans" element={<SubscriptionPlansPage />} />
              <Route path="/subscription-success" element={<SubscriptionSuccessPage />} />
              
              
              
              {/* Rota para videochamada do terapeuta */}
              <Route 
                path="/videochamada/:patientName" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <VideoCallPage />
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Rota para videochamada Daily.co do terapeuta */}
              <Route 
                path="/daily-call/:callId" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <DailyCallPage />
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Nova rota específica para videochamada Daily.co */}
              <Route 
                path="/daily-video-call/:callId" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <DailyVideoCallPage />
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Rota para videochamada com IA */}
              <Route 
                path="/video-call" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <VideoCallPage />
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Rota específica para pacientes - sem Layout */}
              <Route 
                path="/monitor" 
                element={
                  <PatientProtectedRoute>
                    <MonitorPage />
                  </PatientProtectedRoute>
                } 
              />
              
              {/* Redirect patients to monitor if they try to access therapist routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <Layout><Dashboard /></Layout>
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Rotas para terapeutas - todas protegidas contra pacientes e requerem assinatura */}
              <Route path="/analise-corporal" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><AnaliseCorporalPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              
              {/* Rotas para análises corporais - páginas completas sem layout */}
              <Route path="/analise-detalhada/:patientId/:patientName" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><DetailedAnalysisPage /></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/analise-resumida/:patientId/:patientName" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><SimplifiedAnalysisPage /></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><FinanceiroPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/financeiro/plano-contas" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><PlanoContasPage /></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/gestao-terapeutica" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><GestaoTerapeuticaPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/indicadores" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><IndicadoresPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><AgendaPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/prontuario" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><ProntuarioPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/pacientes" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><PacientesPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/pacientes/cadastrar" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><CadastrarPacientePage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><ConfiguracoesPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/gestao-creditos" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><GestaoCreditosPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/gestao-pacotes" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><GestaoPacotesPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="/gestao-planos" element={<ProtectedRoute><PatientRedirectWrapper><SubscriptionProtection><Layout><GestaPlanosPage /></Layout></SubscriptionProtection></PatientRedirectWrapper></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
              {/* Rota para atendimento com IA */}
              <Route 
                path="/ai-assistance" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <AIAssistancePage />
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Rota para atendimento básico */}
              <Route 
                path="/basic-appointment" 
                element={
                  <ProtectedRoute>
                    <PatientRedirectWrapper>
                      <SubscriptionProtection>
                        <BasicAppointmentPage />
                      </SubscriptionProtection>
                    </PatientRedirectWrapper>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </BrowserRouter>
      </TooltipProvider>
    </TimezoneProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
