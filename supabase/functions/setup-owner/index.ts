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

    // Check if owner already exists
    const { data: existing } = await adminClient
      .from('admins')
      .select('id')
      .eq('role', 'owner')
      .maybeSingle();

    if (existing) {
      throw new Error('Owner already exists. Use transfer-ownership to change owner.');
    }

    const { email, password, displayName, masterPasscode } = await req.json();
    if (!email || !password || !masterPasscode) {
      throw new Error('Email, password, and master passcode are required');
    }
    if (masterPasscode.length < 6) {
      throw new Error('Master passcode must be at least 6 characters');
    }

    // Hash the master passcode using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(masterPasscode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPasscode = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;

    // Insert admin record as owner
    const { error: insertErr } = await adminClient.from('admins').insert({
      user_id: newUser.user.id,
      role: 'owner',
      school_id: null,
      display_name: displayName || '',
    });
    if (insertErr) throw insertErr;

    // Store hashed master passcode
    const { error: settingsErr } = await adminClient.from('system_settings').insert({
      key: 'master_passcode',
      value: hashedPasscode,
    });
    if (settingsErr) throw settingsErr;

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
