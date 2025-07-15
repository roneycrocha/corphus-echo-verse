import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      patientId, 
      transcriptionId,
      analysisData,
      sessionType = 'ai_assistance'
    } = await req.json()

    if (!patientId) {
      throw new Error('Patient ID is required')
    }

    if (!analysisData) {
      throw new Error('Analysis data is required')
    }

    console.log('Saving conversation analysis for patient:', patientId)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header is required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Save conversation analysis to database
    const { data, error } = await supabase
      .from('conversation_analyses')
      .insert({
        patient_id: patientId,
        transcription_id: transcriptionId,
        session_type: sessionType,
        questions: analysisData.questions || [],
        patient_traits_summary: analysisData.patient_traits_summary || '',
        conversation_summary: analysisData.conversation_summary || '',
        raw_response: analysisData.raw_response || '',
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving conversation analysis:', error)
      throw new Error(`Failed to save conversation analysis: ${error.message}`)
    }

    console.log('Conversation analysis saved successfully:', data.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysisId: data.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in save-conversation-analysis function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})