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
  Row,
  Column,
  Img,
  Hr,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  userName: string
  packageName: string
  creditsAdded: number
  planType?: string
  billingCycle?: string
  amountPaid?: number
  loginUrl: string
}

export const WelcomeEmail = ({
  userName,
  packageName,
  creditsAdded,
  planType,
  billingCycle,
  amountPaid,
  loginUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Bem-vindo ao corphus.ai - Sua assinatura está ativa!</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerSection}>
          <Row>
            <Column>
              <Heading style={logo}>corphus.ai</Heading>
              <Text style={tagline}>Análise Terapêutica Inteligente</Text>
            </Column>
          </Row>
        </Section>

        {/* Welcome Message */}
        <Section style={welcomeSection}>
          <Heading style={h1}>🎉 Bem-vindo, {userName}!</Heading>
          <Text style={welcomeText}>
            Parabéns! Sua assinatura do <strong>corphus.ai</strong> foi ativada com sucesso. 
            Agora você tem acesso a todas as funcionalidades premium da nossa plataforma 
            de análise terapêutica inteligente.
          </Text>
        </Section>

        {/* Subscription Details */}
        <Section style={detailsSection}>
          <Heading style={h2}>📋 Detalhes da sua assinatura</Heading>
          <Row style={detailRow}>
            <Column style={detailLabel}>
              <Text style={labelText}>Plano:</Text>
            </Column>
            <Column style={detailValue}>
              <Text style={valueText}>{packageName}</Text>
            </Column>
          </Row>
          {planType && (
            <Row style={detailRow}>
              <Column style={detailLabel}>
                <Text style={labelText}>Tipo:</Text>
              </Column>
              <Column style={detailValue}>
                <Text style={valueText}>{planType}</Text>
              </Column>
            </Row>
          )}
          {billingCycle && (
            <Row style={detailRow}>
              <Column style={detailLabel}>
                <Text style={labelText}>Ciclo:</Text>
              </Column>
              <Column style={detailValue}>
                <Text style={valueText}>{billingCycle === 'monthly' ? 'Mensal' : 'Anual'}</Text>
              </Column>
            </Row>
          )}
          <Row style={detailRow}>
            <Column style={detailLabel}>
              <Text style={labelText}>Créditos:</Text>
            </Column>
            <Column style={detailValue}>
              <Text style={valueText}>{creditsAdded} créditos</Text>
            </Column>
          </Row>
          {amountPaid && (
            <Row style={detailRow}>
              <Column style={detailLabel}>
                <Text style={labelText}>Valor pago:</Text>
              </Column>
              <Column style={detailValue}>
                <Text style={valueText}>R$ {(amountPaid / 100).toFixed(2)}</Text>
              </Column>
            </Row>
          )}
        </Section>

        {/* Features */}
        <Section style={featuresSection}>
          <Heading style={h2}>🚀 O que você pode fazer agora:</Heading>
          <Row style={featureRow}>
            <Column style={featureColumn}>
              <Text style={featureTitle}>🧠 Análise Corporal com IA</Text>
              <Text style={featureText}>
                Utilize nossa avançada análise corporal com inteligência artificial 
                para avaliações precisas e detalhadas.
              </Text>
            </Column>
          </Row>
          <Row style={featureRow}>
            <Column style={featureColumn}>
              <Text style={featureTitle}>📊 Relatórios Inteligentes</Text>
              <Text style={featureText}>
                Gere relatórios automáticos e personalizados para seus pacientes 
                com insights baseados em dados.
              </Text>
            </Column>
          </Row>
          <Row style={featureRow}>
            <Column style={featureColumn}>
              <Text style={featureTitle}>👥 Gestão de Pacientes</Text>
              <Text style={featureText}>
                Organize e gerencie todos os seus pacientes em um só lugar, 
                com prontuários digitais completos.
              </Text>
            </Column>
          </Row>
          <Row style={featureRow}>
            <Column style={featureColumn}>
              <Text style={featureTitle}>🎯 Planos Terapêuticos</Text>
              <Text style={featureText}>
                Crie planos de tratamento personalizados com sugestões 
                baseadas em inteligência artificial.
              </Text>
            </Column>
          </Row>
        </Section>

        {/* CTA Button */}
        <Section style={ctaSection}>
          <Button pX={20} pY={12} style={button} href={loginUrl}>
            Acessar minha conta
          </Button>
        </Section>

        {/* Support */}
        <Section style={supportSection}>
          <Heading style={h3}>💬 Precisa de ajuda?</Heading>
          <Text style={supportText}>
            Nossa equipe está aqui para ajudá-lo a aproveitar ao máximo o corphus.ai.
            Entre em contato conosco através do nosso suporte integrado na plataforma.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            Este email foi enviado para {userName} porque você se inscreveu no corphus.ai.
          </Text>
          <Text style={footerText}>
            <Link href="#" style={footerLink}>
              corphus.ai
            </Link>
            {' • '}
            <Link href="#" style={footerLink}>
              Suporte
            </Link>
            {' • '}
            <Link href="#" style={footerLink}>
              Política de Privacidade
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '600px',
  padding: '20px',
}

const headerSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logo = {
  color: '#2563eb',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const tagline = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const welcomeSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px',
}

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
}

const h3 = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
}

const welcomeText = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0',
}

const detailsSection = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '32px',
}

const detailRow = {
  marginBottom: '8px',
}

const detailLabel = {
  width: '120px',
}

const detailValue = {
  width: 'auto',
}

const labelText = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const valueText = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
}

const featuresSection = {
  marginBottom: '32px',
}

const featureRow = {
  marginBottom: '20px',
}

const featureColumn = {
  width: '100%',
}

const featureTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const featureText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.4',
  margin: '0',
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
}

const supportSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '32px',
}

const supportText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.4',
  margin: '0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footerSection = {
  textAlign: 'center' as const,
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0 0 8px',
}

const footerLink = {
  color: '#6b7280',
  textDecoration: 'none',
}