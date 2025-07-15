import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.headers.get("upgrade") !== "websocket") {
    return new Response(JSON.stringify({ error: 'Expected WebSocket connection' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAIWs: WebSocket | null = null;
  let sessionReady = false;

  // Connect to OpenAI Realtime API
  const connectToOpenAI = () => {
    const openAIUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
    openAIWs = new WebSocket(openAIUrl, undefined, {
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });

    openAIWs.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
    };

    openAIWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('OpenAI message type:', data.type);
        
        // Configure session after session.created
        if (data.type === 'session.created') {
          const sessionConfig = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: "You are a transcription assistant. Only transcribe what you hear, don't respond or comment.",
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
              },
              temperature: 0.1
            }
          };
          
          console.log('Sending session config');
          openAIWs?.send(JSON.stringify(sessionConfig));
        }
        
        // Mark session as ready
        if (data.type === 'session.updated') {
          sessionReady = true;
          console.log('Session ready for audio input');
          socket.send(JSON.stringify({ type: 'session_ready' }));
        }
        
        // Forward transcription events to client
        if (data.type === 'input_audio_buffer.speech_started') {
          console.log('Speech started detected');
          socket.send(JSON.stringify({ type: 'speech_started' }));
        }
        
        if (data.type === 'input_audio_buffer.speech_stopped') {
          console.log('Speech stopped detected');
          socket.send(JSON.stringify({ type: 'speech_stopped' }));
        }
        
        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          console.log('Transcription completed:', data.transcript);
          socket.send(JSON.stringify({
            type: 'transcription_completed',
            transcript: data.transcript,
            item_id: data.item_id
          }));
        }
        
        if (data.type === 'conversation.item.input_audio_transcription.failed') {
          console.log('Transcription failed:', data.error);
          socket.send(JSON.stringify({
            type: 'transcription_failed',
            error: data.error
          }));
        }
        
      } catch (error) {
        console.error('Error parsing OpenAI message:', error);
      }
    };

    openAIWs.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
    };

    openAIWs.onclose = () => {
      console.log('OpenAI WebSocket closed');
      sessionReady = false;
      socket.send(JSON.stringify({ type: 'openai_disconnected' }));
    };
  };

  socket.onopen = () => {
    console.log('Client WebSocket connected');
    connectToOpenAI();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'audio_chunk' && openAIWs?.readyState === WebSocket.OPEN && sessionReady) {
        // Forward audio data to OpenAI
        const audioEvent = {
          type: 'input_audio_buffer.append',
          audio: data.audio
        };
        openAIWs.send(JSON.stringify(audioEvent));
      }
    } catch (error) {
      console.error('Error processing client message:', error);
    }
  };

  socket.onclose = () => {
    console.log('Client WebSocket disconnected');
    openAIWs?.close();
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
    openAIWs?.close();
  };

  return response;
});