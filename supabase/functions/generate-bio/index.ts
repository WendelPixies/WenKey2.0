import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords } = await req.json();
    
    if (!keywords || keywords.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Keywords are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente criativo especializado em escrever biografias profissionais concisas e impactantes. Crie biografias de 2-3 frases que destaquem experiência, habilidades e personalidade profissional.',
          },
          {
            role: 'user',
            content: `Crie uma biografia profissional criativa e engajante com base nestas palavras-chave: ${keywords}`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao seu workspace Lovable.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const bio = data.choices?.[0]?.message?.content?.trim();

    if (!bio) {
      throw new Error('No bio generated');
    }

    return new Response(
      JSON.stringify({ bio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-bio error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});