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
      transcriptionText, 
      audioBlob, 
      sessionType = 'ai_assistance',
      audioDuration 
    } = await req.json()

    if (!patientId) {
      throw new Error('Patient ID is required')
    }

    console.log('Saving transcription for patient:', patientId)

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

    let audioUrl = null

    // If audio blob is provided, save it to storage
    if (audioBlob) {
      const audioFileName = `transcriptions/${patientId}/${Date.now()}.webm`
      
      // Convert base64 to binary
      const binaryString = atob(audioBlob)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transcriptions')
        .upload(audioFileName, bytes, {
          contentType: 'audio/webm',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading audio:', uploadError)
        throw new Error(`Failed to upload audio: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('transcriptions')
        .getPublicUrl(audioFileName)

      audioUrl = urlData.publicUrl
      console.log('Audio uploaded successfully:', audioUrl)
    }

    // Save transcription to database
    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        patient_id: patientId,
        session_type: sessionType,
        transcription_text: transcriptionText,
        audio_url: audioUrl,
        audio_duration_seconds: audioDuration,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving transcription:', error)
      throw new Error(`Failed to save transcription: ${error.message}`)
    }

    console.log('Transcription saved successfully:', data.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcriptionId: data.id,
        audioUrl: audioUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in save-transcription function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})