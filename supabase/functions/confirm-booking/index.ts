import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, scheduledAt, sessionType, notes, appointmentDuration } = await req.json()

    if (!token || !scheduledAt || !sessionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar se o token é válido
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('patient_booking_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar a sessão
    const { error: sessionError } = await supabaseClient
      .from('sessions')
      .insert({
        patient_id: tokenData.patient_id,
        scheduled_at: scheduledAt,
        duration_minutes: appointmentDuration || 60,
        session_type: sessionType,
        notes: notes || null,
        status: 'agendada'
      })

    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar agendamento' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Marcar token como usado
    const { error: updateError } = await supabaseClient
      .from('patient_booking_tokens')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('token', token)

    if (updateError) {
      console.error('Erro ao atualizar token:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao finalizar agendamento' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Agendamento confirmado com sucesso' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})