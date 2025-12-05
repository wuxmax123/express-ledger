import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  batchId: number;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  effectiveDate?: string; // Optional effective date for the version
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user has rate_supervisor or admin role
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['rate_supervisor', 'admin']);

    if (roleError || !roles || roles.length === 0) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { batchId, action, rejectionReason, effectiveDate }: ApprovalRequest = await req.json();
    console.log(`Processing ${action} for batch ${batchId} by user ${user.id}`);

    // Update vendor_batch approval status
    const updateData: Record<string, unknown> = {
      approval_status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { error: batchUpdateError } = await supabase
      .from('vendor_batches')
      .update(updateData)
      .eq('id', batchId);

    if (batchUpdateError) {
      console.error('Batch update error:', batchUpdateError);
      throw batchUpdateError;
    }

    // Get batch info including effective_date
    const { data: batchInfo, error: batchInfoError } = await supabase
      .from('vendor_batches')
      .select('effective_date')
      .eq('id', batchId)
      .single();

    if (batchInfoError) {
      console.error('Batch info error:', batchInfoError);
    }

    // Update all related channel_rate_sheets
    const { error: sheetsUpdateError } = await supabase
      .from('channel_rate_sheets')
      .update({
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: action === 'reject' ? rejectionReason : null,
        status: action === 'approve' ? 'active' : 'inactive'
      })
      .eq('batch_id', batchId);

    if (sheetsUpdateError) {
      console.error('Sheets update error:', sheetsUpdateError);
      throw sheetsUpdateError;
    }

    // If approved, create effective versions for each channel
    const createdVersions: Array<{ channelId: number; versionCode: string }> = [];
    
    if (action === 'approve') {
      // Get all sheets in this batch to create effective versions
      const { data: sheets, error: sheetsError } = await supabase
        .from('channel_rate_sheets')
        .select('channel_id')
        .eq('batch_id', batchId);

      if (sheetsError) {
        console.error('Error fetching sheets:', sheetsError);
      } else if (sheets && sheets.length > 0) {
        // Get unique channel IDs
        const uniqueChannelIds = [...new Set(sheets.map(s => s.channel_id).filter(Boolean))];
        
        for (const channelId of uniqueChannelIds) {
          // Generate version code using database function
          const { data: versionCodeData, error: versionCodeError } = await supabase
            .rpc('generate_version_code', { p_channel_id: channelId });

          if (versionCodeError) {
            console.error(`Error generating version code for channel ${channelId}:`, versionCodeError);
            continue;
          }

          const versionCode = versionCodeData as string;
          const versionEffectiveDate = effectiveDate || batchInfo?.effective_date || new Date().toISOString().split('T')[0];

          // Deactivate previous active versions for this channel
          await supabase
            .from('effective_versions')
            .update({ is_active: false })
            .eq('channel_id', channelId)
            .eq('is_active', true);

          // Create new effective version
          const { error: versionError } = await supabase
            .from('effective_versions')
            .insert({
              version_code: versionCode,
              batch_id: batchId,
              channel_id: channelId,
              effective_date: versionEffectiveDate,
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              is_active: true
            });

          if (versionError) {
            console.error(`Error creating effective version for channel ${channelId}:`, versionError);
          } else {
            createdVersions.push({ channelId, versionCode });
            console.log(`Created effective version ${versionCode} for channel ${channelId}`);
          }
        }
      }
    }

    console.log(`Successfully ${action}ed batch ${batchId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Batch ${action}ed successfully`,
        createdVersions: action === 'approve' ? createdVersions : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in approve-batch function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
