import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { masterPasscode } = await req.json();
    if (!masterPasscode) throw new Error('Master passcode is required');

    // Hash the provided passcode
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(masterPasscode));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verify against stored passcode
    const { data: setting } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'master_passcode')
      .single();

    if (!setting || setting.value !== hashedInput) {
      throw new Error('Invalid master passcode');
    }

    // Delete all app data (cascade will handle related records)
    await adminClient.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('schools').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Get all admin user_ids to delete auth users
    const { data: admins } = await adminClient
      .from('admins')
      .select('user_id');

    // Delete all admins from the admins table
    await adminClient.from('admins').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Delete system settings
    await adminClient.from('system_settings').delete().neq('key', '');

    // Delete auth users
    if (admins) {
      for (const admin of admins) {
        await adminClient.auth.admin.deleteUser(admin.user_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
