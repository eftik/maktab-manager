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

    const { masterPasscode, newOwnerEmail, newOwnerPassword, newOwnerDisplayName, newMasterPasscode } = await req.json();

    if (!masterPasscode || !newOwnerEmail || !newOwnerPassword) {
      throw new Error('Master passcode, new owner email, and password are required');
    }
    if (newMasterPasscode && newMasterPasscode.length < 6) {
      throw new Error('New master passcode must be at least 6 characters');
    }

    // Verify master passcode
    const encoder = new TextEncoder();
    const data = encoder.encode(masterPasscode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: stored } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'master_passcode')
      .single();

    if (!stored || stored.value !== hashedInput) {
      throw new Error('Invalid master passcode');
    }

    // Demote current owner to admin
    const { data: currentOwner } = await adminClient
      .from('admins')
      .select('id, user_id')
      .eq('role', 'owner')
      .single();

    if (currentOwner) {
      await adminClient
        .from('admins')
        .update({ role: 'admin' })
        .eq('id', currentOwner.id);
    }

    // Check if new owner email already has an auth account
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === newOwnerEmail);

    let newUserId: string;

    if (existingUser) {
      newUserId = existingUser.id;
      // Update existing admin record to owner, or create one
      const { data: existingAdmin } = await adminClient
        .from('admins')
        .select('id')
        .eq('user_id', newUserId)
        .maybeSingle();

      if (existingAdmin) {
        await adminClient
          .from('admins')
          .update({ role: 'owner', display_name: newOwnerDisplayName || '', school_id: null })
          .eq('id', existingAdmin.id);
      } else {
        await adminClient.from('admins').insert({
          user_id: newUserId,
          role: 'owner',
          display_name: newOwnerDisplayName || '',
          school_id: null,
        });
      }
    } else {
      // Create new auth user
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: newOwnerEmail,
        password: newOwnerPassword,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      newUserId = newUser.user.id;

      await adminClient.from('admins').insert({
        user_id: newUserId,
        role: 'owner',
        display_name: newOwnerDisplayName || '',
        school_id: null,
      });
    }

    // Update master passcode if new one provided
    if (newMasterPasscode) {
      const newData = encoder.encode(newMasterPasscode);
      const newHashBuffer = await crypto.subtle.digest('SHA-256', newData);
      const newHashArray = Array.from(new Uint8Array(newHashBuffer));
      const newHashed = newHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await adminClient.from('system_settings').update({
        value: newHashed,
        updated_at: new Date().toISOString(),
      }).eq('key', 'master_passcode');
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
