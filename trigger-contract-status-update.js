#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in environment variables');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateContractStatuses() {
  try {
    console.log('🔄 Checking and updating contract statuses...');
    
    // First, let's check contracts that should be expired
    const { data: expiredContracts, error: expiredError } = await supabase
      .from('contracts')
      .select('id, title, status, expiry_date')
      .lt('expiry_date', new Date().toISOString().split('T')[0])
      .neq('status', 'expired');

    if (expiredError) {
      console.error('❌ Error fetching expired contracts:', expiredError);
      return;
    }

    console.log(`📋 Found ${expiredContracts.length} contracts that should be expired:`);
    expiredContracts.forEach(contract => {
      console.log(`  - ${contract.title} (${contract.status}) - expired on ${contract.expiry_date}`);
    });

    // Update expired contracts
    if (expiredContracts.length > 0) {
      const { data: updateResult, error: updateError } = await supabase
        .from('contracts')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .lt('expiry_date', new Date().toISOString().split('T')[0])
        .neq('status', 'expired')
        .select();

      if (updateError) {
        console.error('❌ Error updating expired contracts:', updateError);
        return;
      }

      console.log(`✅ Successfully updated ${updateResult.length} contracts to expired status`);
      updateResult.forEach(contract => {
        console.log(`  ✓ ${contract.title} - now marked as expired`);
      });
    }

    // Now trigger the full RPC function for comprehensive updates
    console.log('\n🔄 Triggering comprehensive contract status update...');
    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_contract_expirations');
    
    if (rpcError) {
      console.error('❌ Error calling update_contract_expirations RPC:', rpcError);
      return;
    }

    console.log('✅ Contract status update completed successfully!');
    if (rpcResult && rpcResult.length > 0) {
      const result = rpcResult[0];
      console.log(`📊 Update Summary:`);
      console.log(`  - Total contracts updated: ${result.updated_count}`);
      console.log(`  - Expired contracts: ${result.expired_count}`);
      console.log(`  - Expiring contracts: ${result.expiring_count}`);
      console.log(`  - Notifications sent: ${result.notifications_sent}`);
    }

  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

// Run the update
updateContractStatuses();
