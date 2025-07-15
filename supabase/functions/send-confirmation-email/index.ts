import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    console.log('=== Iniciando send-confirmation-email ===')
    
    const payload = await req.text()
    console.log('Payload recebido:', payload)

    // Parse do payload JSON
    let emailData
    try {
      emailData = JSON.parse(payload)
    } catch (parseError) {
      console.error('Erro ao fazer parse do payload:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Estrutura do emailData:', JSON.stringify(emailData, null, 2))

    // Extrair dados do usuário - pode vir em diferentes formatos
    let user = emailData.user || emailData.record || emailData
    let userEmail = user?.email || user?.new_record?.email || emailData?.email

    if (!userEmail) {
      console.error('Email do usuário não encontrado:', emailData)
      return new Response(
        JSON.stringify({ error: 'User email not found' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar se o Resend API key está configurado
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurado')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const resend = new Resend(resendApiKey)

    // Para signup simples, não precisamos de link de confirmação complexo
    // Vamos enviar um email de boas-vindas simples
    const userName = user?.raw_user_meta_data?.full_name || user?.user_metadata?.full_name || userEmail.split('@')[0]

    console.log('Dados extraídos:', {
      userEmail,
      userName,
      hasUserData: !!user
    })

    // Template HTML simples de boas-vindas
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Bem-vindo ao corphus.ai</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #333;">Bem-vindo ao corphus.ai, ${userName}!</h1>
          <p style="color: #666; font-size: 16px;">Sua conta foi criada com sucesso!</p>
          <p style="color: #999; font-size: 14px;">Agora você pode fazer login e começar a usar nossa plataforma.</p>
          <a href="https://dcc20789-4808-4fc7-897c-31beb5c26170.lovableproject.com/login" 
             style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Fazer Login
          </a>
        </div>
      </body>
    </html>
    `

    const subject = 'Bem-vindo ao corphus.ai!'

    console.log('Enviando email para:', userEmail)

    // Enviar email via Resend
    const emailResult = await resend.emails.send({
      from: 'corphus.ai <onboarding@resend.dev>',
      to: [userEmail],
      subject: subject,
      html,
    })

    if (emailResult.error) {
      console.error('Erro do Resend:', emailResult.error)
      throw new Error(`Resend error: ${JSON.stringify(emailResult.error)}`)
    }

    console.log('Email enviado com sucesso:', emailResult.data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email enviado com sucesso',
        emailId: emailResult.data?.id 
      }), 
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    )
  } catch (error: any) {
    console.error('=== ERRO na função send-confirmation-email ===')
    console.error('Erro:', error)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Unknown error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    )
  }
})