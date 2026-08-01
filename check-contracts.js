#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContracts() {
  try {
    console.log('📋 Checking all contracts...');
    
    // Get all contracts with their expiry dates
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, title, status, expiry_date, updated_at')
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching contracts:', error);
      return;
    }

    console.log(`\n📊 Found ${contracts.length} contracts total:`);
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`🗓️  Today's date: ${today}\n`);

    contracts.forEach(contract => {
      const expiry = contract.expiry_date ? contract.expiry_date.split('T')[0] : 'No expiry date';
      const isExpired = contract.expiry_date && contract.expiry_date.split('T')[0] < today;
      const daysDiff = contract.expiry_date ? 
        Math.ceil((new Date(contract.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      
      console.log(`📄 ${contract.title}`);
      console.log(`   Status: ${contract.status}`);
      console.log(`   Expiry: ${expiry}`);
      console.log(`   Days until expiry: ${daysDiff !== null ? daysDiff : 'N/A'}`);
      console.log(`   Should be expired: ${isExpired ? '❌ YES' : '✅ NO'}`);
      console.log(`   Updated: ${contract.updated_at}\n`);
    });

    // Show contracts that should be expired but aren't
    const shouldBeExpired = contracts.filter(c => 
      c.expiry_date && 
      c.expiry_date.split('T')[0] < today && 
      c.status !== 'expired'
    );

    if (shouldBeExpired.length > 0) {
      console.log(`🚨 Found ${shouldBeExpired.length} contracts that should be expired:`);
      shouldBeExpired.forEach(contract => {
        console.log(`   - ${contract.title} (${contract.status}) - expired on ${contract.expiry_date.split('T')[0]}`);
      });
    } else {
      console.log('✅ All contracts have correct expiry status!');
    }

  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

// Run the check
checkContracts();
