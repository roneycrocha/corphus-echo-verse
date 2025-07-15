import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface EmailConfirmationProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const EmailConfirmationTemplate = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
}: EmailConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Confirme seu email para acessar o corphus.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>🧠 corphus.ai</Text>
        </Section>
        
        <Heading style={h1}>Bem-vindo ao corphus.ai!</Heading>
        
        <Text style={text}>
          Olá! Obrigado por se cadastrar na nossa plataforma de análise terapêutica inteligente.
        </Text>
        
        <Text style={text}>
          Para começar a usar todas as funcionalidades do corphus.ai, você precisa confirmar seu endereço de email:
        </Text>
        
        <Section style={buttonSection}>
          <Button
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            style={button}
          >
            Confirmar Email
          </Button>
        </Section>
        
        <Text style={text}>
          Ou, se preferir, copie e cole este código de confirmação:
        </Text>
        
        <Section style={codeSection}>
          <Text style={code}>{token}</Text>
        </Section>
        
        <Hr style={hr} />
        
        <Text style={footerText}>
          <strong>O que você pode fazer com o corphus.ai:</strong>
        </Text>
        
        <ul style={featuresList}>
          <li style={featureItem}>📊 Análise corporal avançada com IA</li>
          <li style={featureItem}>👥 Gestão completa de pacientes</li>
          <li style={featureItem}>📋 Relatórios inteligentes</li>
          <li style={featureItem}>💬 Transcrição em tempo real</li>
          <li style={featureItem}>📈 Dashboard com métricas</li>
        </ul>
        
        <Hr style={hr} />
        
        <Text style={disclaimerText}>
          Se você não criou uma conta no corphus.ai, pode ignorar este email com segurança.
        </Text>
        
        <Text style={footer}>
          <Link
            href="https://corphus.ai"
            target="_blank"
            style={footerLink}
          >
            corphus.ai
          </Link>
          - Análise Terapêutica Inteligente
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailConfirmationTemplate

// Estilos
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  border: '1px solid #e6ebf1',
}

const logoSection = {
  padding: '20px 40px',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#6366f1',
  margin: '0',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 40px 20px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const codeSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
}

const code = {
  display: 'inline-block',
  padding: '16px',
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  fontFamily: 'monospace',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
}

const footerText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px 8px',
}

const featuresList = {
  margin: '0 40px 16px',
  padding: '0',
}

const featureItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
}

const disclaimerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 40px',
  textAlign: 'center' as const,
}

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 40px 0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#6366f1',
  textDecoration: 'none',
}