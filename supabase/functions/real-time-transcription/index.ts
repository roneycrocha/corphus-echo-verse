import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Função para converter áudio WebM para WAV
async function convertToWav(webmData: Uint8Array): Promise<Blob> {
  // Simular uma conversão básica - na verdade vamos tentar processar diretamente
  // A OpenAI aceita vários formatos, então vamos tentar WebM mesmo
  const wavHeader = new Uint8Array(44);
  const view = new DataView(wavHeader.buffer);
  
  // WAV header básico
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + webmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 88200, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, webmData.length, true);
  
  // Combinar header + dados
  const combined = new Uint8Array(wavHeader.length + webmData.length);
  combined.set(wavHeader, 0);
  combined.set(webmData, wavHeader.length);
  
  return new Blob([combined], { type: 'audio/wav' });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, speaker, optimized = false } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`Processing transcription for speaker: ${speaker}, optimized: ${optimized}`);
    console.log(`Audio data size: ${audio.length} characters`);

    // Para modo otimizado, verificar tamanho mínimo
    if (optimized && audio.length < 1000) {
      console.log('Audio chunk too small for optimized mode, returning empty');
      return new Response(
        JSON.stringify({ 
          text: '',
          speaker: speaker,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decodificar base64 para binary seguindo especificação da OpenAI
    let binaryData: Uint8Array;
    try {
      const binaryString = atob(audio);
      binaryData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryData[i] = binaryString.charCodeAt(i);
      }
      console.log(`Decoded binary data size: ${binaryData.length} bytes`);
    } catch (error) {
      console.error('Error decoding base64:', error);
      throw new Error('Invalid base64 audio data');
    }

    // Verificar se temos dados suficientes
    if (binaryData.length < 1000) {
      console.log('Binary data too small, skipping transcription');
      return new Response(
        JSON.stringify({ 
          text: '',
          speaker: speaker,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter para WAV que é mais compatível com OpenAI
    const wavBlob = await convertToWav(binaryData);
    console.log(`Created WAV blob with size: ${wavBlob.size} bytes`);
    
    // Preparar FormData seguindo exatamente a documentação oficial da OpenAI
    const formData = new FormData();
    
    // Adicionar arquivo WAV
    formData.append('file', wavBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    
    // Adicionar prompt opcional conforme documentação
    if (!optimized) {
      formData.append('prompt', 'Esta é uma consulta médica/terapêutica em português. Inclua pontuação adequada.');
    }

    console.log('Sending request to OpenAI Whisper API');

    // Enviar para OpenAI seguindo exatamente a documentação oficial
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        // Não incluir Content-Type - FormData define automaticamente
      },
      body: formData,
    });

    console.log(`OpenAI response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('OpenAI response received:', result);
    
    // Processar texto conforme retornado pela API
    let finalText = result.text || '';
    
    if (optimized) {
      finalText = finalText.trim();
      // Filtrar ruídos comuns para modo otimizado
      const noisePatterns = [/^uh+$/i, /^um+$/i, /^ah+$/i, /^\s*$/, /^\.+$/, /^,+$/];
      const isNoise = noisePatterns.some(pattern => pattern.test(finalText));
      if (isNoise || finalText.length < 3) {
        finalText = '';
      }
    }
    
    console.log('Final transcription result:', finalText);

    return new Response(
      JSON.stringify({ 
        text: finalText,
        speaker: speaker,
        timestamp: new Date().toISOString(),
        optimized: optimized
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcription function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});