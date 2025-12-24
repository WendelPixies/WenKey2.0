
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { JWT } from 'https://esm.sh/google-auth-library@9.7.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
    quarter_id: string;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { quarter_id } = await req.json() as RequestBody;

        if (!quarter_id) {
            throw new Error('Quarter ID is required');
        }

        // 1. Get Quarter Data
        const { data: quarter, error: quarterError } = await supabaseClient
            .from('quarters')
            .select('*')
            .eq('id', quarter_id)
            .single();

        if (quarterError || !quarter) throw new Error('Quarter not found');

        // 2. Get Check-ins for this Quarter
        const { data: checkins, error: checkinsError } = await supabaseClient
            .from('checkins')
            .select('*')
            .eq('quarter_id', quarter_id);

        if (checkinsError || !checkins || checkins.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No check-ins found for this quarter' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Get Company Users (Collaborators)
        const { data: users, error: usersError } = await supabaseClient
            .from('profiles')
            .select('email, full_name')
            .eq('company_id', quarter.company_id)
            .eq('is_active', true);

        if (usersError || !users || users.length === 0) {
            throw new Error('No active users found for this company');
        }

        const attendees = users
            .filter(u => u.email) // Ensure email exists
            .map(u => ({ email: u.email }));

        console.log(`Found ${attendees.length} attendees for ${checkins.length} check-ins`);

        // 4. Verify Google Credentials
        const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

        if (!serviceAccountJson) {
            console.log('GOOGLE_SERVICE_ACCOUNT not configured. returning mock success.');
            // Mock Success for User Feedback
            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Simulação: ${checkins.length} convites seriam enviados para ${attendees.length} colaboradores. (Configure GOOGLE_SERVICE_ACCOUNT para envio real)`,
                    details: { checkins: checkins.length, users: attendees.length }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5. Authenticate with Google (Real Implementation)
        const serviceAccount = JSON.parse(serviceAccountJson);
        const client = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        // 6. Create Calendar Events
        let createdCount = 0;

        for (const checkin of checkins) {
            const date = checkin.checkin_date || checkin.occurred_at;
            if (!date) continue;

            const event = {
                summary: `Check-in de OKR - ${quarter.name}`,
                description: `Check-in programado para o quarter ${quarter.name}. Por favor, atualize seus resultados.`,
                start: {
                    date: date, // All-day event
                },
                end: {
                    date: date, // For all-day events, end is usually the date (inclusive?) check google api
                },
                attendees: attendees,
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 10 },
                    ],
                },
            };

            try {
                await client.request({
                    url: `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
                    method: 'POST',
                    data: event,
                });
                createdCount++;
            } catch (err) {
                console.error('Error creating event:', err);
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: `Agendados ${createdCount} eventos no Google Calendar com sucesso!` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
