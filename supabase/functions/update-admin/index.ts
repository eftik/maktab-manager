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

    if (callerAdmin?.role !== 'owner') throw new Error('Only owner can update admins');

    const { adminId, displayName, phone, idNumber, password, schoolId } = await req.json();
    if (!adminId) throw new Error('Admin ID required');

    // Update admin record
    const updateData: Record<string, any> = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (idNumber !== undefined) updateData.id_number = idNumber;
    if (schoolId !== undefined) updateData.school_id = schoolId || null;

    if (Object.keys(updateData).length > 0) {
      const { error: updateErr } = await adminClient
        .from('admins')
        .update(updateData)
        .eq('id', adminId);
      if (updateErr) throw updateErr;
    }

    // Update password if provided
    if (password) {
      const { data: admin } = await adminClient
        .from('admins')
        .select('user_id')
        .eq('id', adminId)
        .single();
      if (!admin) throw new Error('Admin not found');

      const { error: pwErr } = await adminClient.auth.admin.updateUserById(
        admin.user_id,
        { password }
      );
      if (pwErr) throw pwErr;
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
