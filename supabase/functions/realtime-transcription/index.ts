import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  console.log("Establishing WebSocket connection to OpenAI Realtime API");

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;

  socket.onopen = () => {
    console.log("Client WebSocket connected");
    
    // Conectar à OpenAI Realtime API
    openAISocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`,
      {
        headers: {
          "Authorization": `Bearer ${openAIApiKey}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
      
      // Configurar sessão para transcrição
      const sessionConfig = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: "Você é um assistente de transcrição. Transcreva fielmente o que ouve em português brasileiro.",
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
      
      openAISocket!.send(JSON.stringify(sessionConfig));
      console.log("Session configuration sent");
    };

    openAISocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("OpenAI event:", data.type);
        
        // Repassar eventos relevantes para o cliente
        if (data.type === 'session.created' || 
            data.type === 'session.updated' ||
            data.type === 'input_audio_buffer.speech_started' ||
            data.type === 'input_audio_buffer.speech_stopped' ||
            data.type === 'conversation.item.input_audio_transcription.completed' ||
            data.type === 'conversation.item.input_audio_transcription.failed' ||
            data.type === 'error') {
          socket.send(JSON.stringify(data));
        }
      } catch (error) {
        console.error("Error parsing OpenAI message:", error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Connection to OpenAI failed'
      }));
    };

    openAISocket.onclose = () => {
      console.log("OpenAI WebSocket closed");
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Client message type:", message.type);
      
      // Repassar mensagens do cliente para OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error("Error parsing client message:", error);
    }
  };

  socket.onclose = () => {
    console.log("Client WebSocket disconnected");
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});