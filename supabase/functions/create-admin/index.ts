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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is owner
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error('Not authenticated');

    const adminClient = createClient(supabaseUrl, serviceKey);
    
    const { data: callerAdmin } = await adminClient
      .from('admins')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (callerAdmin?.role !== 'owner') throw new Error('Only owner can create admins');

    const { email, password, displayName, schoolId, phone, idNumber } = await req.json();
    if (!email || !password) throw new Error('Email and password required');

    // Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;

    // Insert admin record
    const { error: insertErr } = await adminClient.from('admins').insert({
      user_id: newUser.user.id,
      role: 'admin',
      school_id: schoolId || null,
      display_name: displayName || '',
      phone: phone || '',
      id_number: idNumber || '',
    });
    if (insertErr) throw insertErr;

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
