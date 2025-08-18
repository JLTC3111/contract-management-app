#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function manualUpdateExpiredContracts() {
  try {
    console.log('🔄 Manually updating expired contracts...');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);
    
    // Find contracts that should be expired but aren't
    const { data: shouldBeExpired, error: fetchError } = await supabase
      .from('contracts')
      .select('id, title, status, expiry_date')
      .lt('expiry_date', today)
      .neq('status', 'expired');

    if (fetchError) {
      console.error('❌ Error fetching contracts:', fetchError);
      return;
    }

    console.log(`📋 Found ${shouldBeExpired.length} contracts that need to be marked as expired:`);
    
    if (shouldBeExpired.length === 0) {
      console.log('✅ All contracts already have correct status!');
      return;
    }

    // Show what we're about to update
    shouldBeExpired.forEach(contract => {
      console.log(`  📄 ${contract.title} (currently: ${contract.status}) - expired on ${contract.expiry_date}`);
    });

    // Update them to expired
    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .lt('expiry_date', today)
      .neq('status', 'expired')
      .select();

    if (updateError) {
      console.error('❌ Error updating contracts:', updateError);
      return;
    }

    console.log(`\n✅ Successfully updated ${updated.length} contracts to expired status:`);
    updated.forEach(contract => {
      console.log(`  ✓ ${contract.title} - now marked as expired`);
    });

    console.log('\n🎉 Manual update completed successfully!');

  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

// Run the manual update
manualUpdateExpiredContracts();
