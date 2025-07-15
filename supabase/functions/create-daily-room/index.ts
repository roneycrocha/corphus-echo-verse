import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { patientName, patientId, callId } = await req.json();

    // Get Daily.co API key from Supabase secrets
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      throw new Error('Daily.co API key not configured');
    }

    const roomName = `session-${callId}`;

    // Primeiro, verificar se a sala já existe
    const existingRoomResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    let roomData;
    
    if (existingRoomResponse.ok) {
      // Sala já existe, usar a existente
      roomData = await existingRoomResponse.json();
      console.log(`Room ${roomName} already exists, reusing it`);
    } else {
      // Criar nova sala
      const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'public',
          properties: {
            max_participants: 2,
            enable_recording: 'cloud',
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2), // 2 hours expiry
            enable_knocking: false,
            enable_prejoin_ui: false,
          },
        }),
      });

      if (!roomResponse.ok) {
        const error = await roomResponse.text();
        throw new Error(`Failed to create Daily.co room: ${error}`);
      }

      roomData = await roomResponse.json();
      console.log(`Created new room: ${roomName}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: roomData.url,
        roomName: roomData.name,
        expires: roomData.config?.exp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating Daily.co room:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});