// @ts-types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"

import { createClient } from '@supabase/supabase-js'
import { JWT } from 'google-auth-library'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
    quarter_id: string;
}

interface Profile {
    email: string | null;
    full_name: string | null;
}

interface Checkin {
    id: string;
    quarter_id: string;
    checkin_date?: string;
    occurred_at?: string;
}

interface Quarter {
    id: string;
    name: string;
    company_id: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let body: RequestBody;
        try {
            const json = await req.json();
            body = json as RequestBody;
        } catch (_) {
            return new Response(
                JSON.stringify({ error: 'Invalid request body. JSON required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { quarter_id } = body;

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

        const quarterData = quarter as Quarter;

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

        const checkinData = checkins as Checkin[];

        // 3. Get Company Users (Collaborators)
        const { data: users, error: usersError } = await supabaseClient
            .from('profiles')
            .select('email, full_name')
            .eq('company_id', quarterData.company_id)
            .eq('is_active', true);

        if (usersError || !users || users.length === 0) {
            throw new Error('No active users found for this company');
        }

        const userData = users as Profile[];

        const attendees = userData
            .filter(u => u.email) // Ensure email exists
            .map(u => ({ email: u.email! }));

        console.log(`Found ${attendees.length} attendees for ${checkinData.length} check-ins`);

        // 4. Verify Google Credentials
        const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

        if (!serviceAccountJson) {
            console.log('GOOGLE_SERVICE_ACCOUNT not configured. returning mock success.');
            // Mock Success for User Feedback
            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Simulação: ${checkinData.length} convites seriam enviados para ${attendees.length} colaboradores. (Configure GOOGLE_SERVICE_ACCOUNT para envio real)`,
                    details: { checkins: checkinData.length, users: attendees.length }
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

        for (const checkin of checkinData) {
            const dateValue = checkin.checkin_date || checkin.occurred_at;
            if (!dateValue) continue;

            // Ensure we use the date part only to avoid timezone shifts
            const dateOnly = typeof dateValue === 'string' && dateValue.includes('T')
                ? dateValue.split('T')[0]
                : dateValue;

            const startDate = new Date(dateOnly + 'T00:00:00');
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);

            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const event = {
                summary: `Check-in de OKR - ${quarterData.name}`,
                description: `Check-in programado para o quarter ${quarterData.name}. Por favor, atualize seus resultados.`,
                start: {
                    date: startStr,
                },
                end: {
                    date: endStr,
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
                    url: `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all`,
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
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
