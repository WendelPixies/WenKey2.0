/// <reference path="../types.d.ts" />
import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckinResult {
  id: string;
  key_result_id: string;
  percentual_atingido: number | null;
}

interface KeyResult {
  id: string;
  objective_id: string;
  weight: number | null;
  direction: string;
  type: string;
  baseline: number;
  floor_value: number;
  target: number;
}

interface Objective {
  id: string;
  user_id: string;
  company_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role using user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.log(`Access denied for user ${user.id} - admin role required`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin user ${user.id} authorized for quarter processing`);

    console.log('Starting quarter results processing...');

    // Get quarters that have ended but are still active
    const today = new Date().toISOString().split('T')[0];
    const { data: endedQuarters, error: quartersError } = await supabase
      .from('quarters')
      .select('id, company_id, end_date, name')
      .lte('end_date', today)
      .eq('is_active', true);

    if (quartersError) {
      console.error('Error fetching quarters:', quartersError);
      throw quartersError;
    }

    console.log(`Found ${endedQuarters?.length || 0} quarters to process`);

    if (!endedQuarters || endedQuarters.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No quarters to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;

    for (const quarter of endedQuarters) {
      console.log(`Processing quarter: ${quarter.name} (${quarter.id})`);

      // Get all objectives for this quarter
      const { data: objectives, error: objectivesError } = await supabase
        .from('objectives')
        .select('id, user_id, company_id')
        .eq('quarter_id', quarter.id);

      if (objectivesError) {
        console.error(`Error fetching objectives for quarter ${quarter.id}:`, objectivesError);
        continue;
      }

      if (!objectives || objectives.length === 0) {
        console.log(`No objectives found for quarter ${quarter.id}`);
        continue;
      }

      // Group objectives by user
      const userObjectivesMap = new Map<string, Objective[]>();
      objectives.forEach((obj: Objective) => {
        if (!userObjectivesMap.has(obj.user_id)) {
          userObjectivesMap.set(obj.user_id, []);
        }
        userObjectivesMap.get(obj.user_id)!.push(obj);
      });

      console.log(`Found ${userObjectivesMap.size} users with objectives in quarter ${quarter.id}`);

      // Process each user
      for (const [userId, userObjectives] of userObjectivesMap) {
        try {
          const resultPercent = await calculateUserQuarterResult(
            supabase,
            quarter.id,
            userId,
            userObjectives
          );

          console.log(`User ${userId} result: ${resultPercent}%`);

          // Save or update the result
          const { error: upsertError } = await supabase
            .from('quarter_results')
            .upsert({
              quarter_id: quarter.id,
              user_id: userId,
              company_id: quarter.company_id,
              result_percent: resultPercent,
              saved_at: new Date().toISOString(),
            }, {
              onConflict: 'quarter_id,user_id'
            });

          if (upsertError) {
            console.error(`Error saving result for user ${userId}:`, upsertError);
          } else {
            processedCount++;
            console.log(`Successfully saved result for user ${userId}`);
          }
        } catch (error) {
          console.error(`Error calculating result for user ${userId}:`, error);
        }
      }
    }

    console.log(`Processing complete. Saved ${processedCount} results.`);

    return new Response(
      JSON.stringify({ 
        message: 'Quarter results processed successfully', 
        processed: processedCount,
        quarters: endedQuarters.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing quarter results:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function calculateUserQuarterResult(
  supabase: SupabaseClient,
  quarterId: string,
  userId: string,
  objectives: Objective[]
): Promise<number> {
  // Get check-ins for this quarter ordered by most recent first
  const { data: checkins, error: checkinsError } = await supabase
    .from('checkins')
    .select('id')
    .eq('quarter_id', quarterId)
    .order('checkin_date', { ascending: false });

  if (checkinsError || !checkins || checkins.length === 0) {
    console.log(`No check-ins found for quarter ${quarterId}`);
    return 0;
  }

  // Get all KRs for user's objectives
  const objectiveIds = objectives.map(obj => obj.id);
  const { data: keyResults, error: krsError } = await supabase
    .from('key_results')
    .select('id, objective_id, weight, direction, type, baseline, floor_value, target')
    .in('objective_id', objectiveIds);

  if (krsError || !keyResults || keyResults.length === 0) {
    console.log(`No KRs found for user ${userId}`);
    return 0;
  }

  const krIds = keyResults.map((kr: KeyResult) => kr.id);

  // Walk through check-ins (newest first) until we find one with KR results
  for (const checkin of checkins) {
    const { data: krResults, error: krResultsError } = await supabase
      .from('checkin_results')
      .select('id, key_result_id, percentual_atingido')
      .eq('checkin_id', checkin.id)
      .in('key_result_id', krIds);

    if (krResultsError) {
      console.error(`Error fetching check-in results for ${checkin.id}:`, krResultsError);
      continue;
    }

    if (!krResults || krResults.length === 0) {
      console.log(`No KR results found for check-in ${checkin.id}`);
      continue;
    }

    // Calculate weighted average by objective using this check-in's results
    const objectiveResults: number[] = [];

    for (const objective of objectives) {
      const objectiveKRs = keyResults.filter((kr: KeyResult) => kr.objective_id === objective.id);
      if (objectiveKRs.length === 0) continue;

      let totalWeight = 0;
      let weightedSum = 0;

      for (const kr of objectiveKRs) {
        const krResult = krResults.find((c: CheckinResult) => c.key_result_id === kr.id);
        const weight = typeof kr.weight === 'number' && !Number.isNaN(kr.weight) ? kr.weight : 1;

        if (krResult && krResult.percentual_atingido !== null) {
          weightedSum += krResult.percentual_atingido * weight;
          totalWeight += weight;
        }
      }

      if (totalWeight > 0) {
        objectiveResults.push(weightedSum / totalWeight);
      }
    }

    if (objectiveResults.length === 0) {
      continue;
    }

    const average = objectiveResults.reduce((sum, val) => sum + val, 0) / objectiveResults.length;
    return Math.round(average * 100) / 100;
  }

  // No check-in had data for this user
  return 0;
}
