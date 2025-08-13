#!/usr/bin/env node

/**
 * Admin Password Reset Utility
 * 
 * This script allows administrators to reset passwords for users whose email addresses
 * don't exist (and therefore can't receive password reset emails).
 * 
 * SECURITY NOTES:
 * - Uses Supabase service role key (admin privileges)
 * - Generates cryptographically secure temporary passwords
 * - Logs all admin actions for audit purposes
 * - Sets force_password_change flag for security
 * 
 * Usage:
 * node admin-password-reset.js <user-email>
 * 
 * Example:
 * node admin-password-reset.js user@company.com
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Supabase admin client with environment validation
 */
function initializeSupabaseAdmin() {
  // Configuration
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin operations

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nMake sure these are set in your .env file');
    process.exit(1);
  }

  // Create admin Supabase client with service role
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Generate a cryptographically secure temporary password
 */
function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  const categories = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz', 
    '0123456789',
    '!@#$%^&*'
  ];
  
  // Add one character from each category
  categories.forEach(category => {
    const randomIndex = crypto.randomInt(0, category.length);
    password += category[randomIndex];
  });
  
  // Fill the rest with random characters from full charset
  for (let i = password.length; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  // Shuffle the password to randomize positions
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}

/**
 * Log admin action for audit purposes
 */
function logAdminAction(action, userEmail, success, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userEmail,
    success,
    details,
    adminUser: process.env.USER || 'unknown'
  };
  
  const logDir = path.join(__dirname, 'logs');
  const logFile = path.join(logDir, 'admin-actions.log');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Append to log file
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  console.log(`📝 Logged action: ${action} for ${userEmail} - ${success ? 'SUCCESS' : 'FAILED'}`);
}

/**
 * Reset password for a user using admin API
 */
async function resetUserPassword(userEmail, supabaseAdmin) {
  try {
    console.log(`🔍 Looking up user: ${userEmail}`);
    
    // First, find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      throw new Error(`User not found: ${userEmail}`);
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
    
    // Generate secure temporary password
    const tempPassword = generateSecurePassword(20);
    
    console.log(`🔐 Generated temporary password for ${userEmail}`);
    
    // Update user password using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: tempPassword,
        user_metadata: {
          ...user.user_metadata,
          force_password_change: true,
          temp_password_set_at: new Date().toISOString(),
          temp_password_set_by: 'admin'
        }
      }
    );
    
    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }
    
    console.log(`✅ Password reset successful for ${userEmail}`);
    
    // Update user profile in database to set force_password_change flag
    try {
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .update({ 
          force_password_change: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);
      
      if (profileError) {
        console.warn(`⚠️  Could not update user profile table: ${profileError.message}`);
      } else {
        console.log(`✅ Updated user profile to force password change`);
      }
    } catch (profileErr) {
      console.warn(`⚠️  Could not update user profile: ${profileErr.message}`);
    }
    
    // Log successful action
    logAdminAction('PASSWORD_RESET', userEmail, true, `Temporary password generated and set`);
    
    // Display results
    console.log('\n🎉 Password Reset Complete!');
    console.log('================================');
    console.log(`User: ${userEmail}`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log(`Force Change: Yes`);
    console.log('================================');
    console.log('\n📋 Next Steps:');
    console.log('1. Securely provide the temporary password to the user');
    console.log('2. User will be forced to change password on next login');
    console.log('3. Temporary password expires when changed');
    console.log('\n⚠️  SECURITY REMINDER:');
    console.log('- Do not send this password via unencrypted channels');
    console.log('- Consider using secure communication methods');
    console.log('- Monitor the audit log for successful password change');
    
    return {
      success: true,
      userEmail,
      tempPassword,
      userId: user.id
    };
    
  } catch (error) {
    console.error(`❌ Password reset failed: ${error.message}`);
    logAdminAction('PASSWORD_RESET', userEmail, false, error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Admin Password Reset Utility');
    console.log('================================');
    console.log('Usage: node admin-password-reset.js <user-email>');
    console.log('\nExample:');
    console.log('  node admin-password-reset.js user@company.com');
    console.log('\nThis will:');
    console.log('• Generate a secure temporary password');
    console.log('• Reset the user\'s password using admin API');
    console.log('• Set force_password_change flag');
    console.log('• Log the action for audit purposes');
    process.exit(0);
  }
  
  // Initialize Supabase client (this will validate environment variables)
  const supabaseAdmin = initializeSupabaseAdmin();
  
  const userEmail = args[0];
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    console.error(`❌ Invalid email format: ${userEmail}`);
    process.exit(1);
  }
  
  console.log('🔧 Admin Password Reset Tool');
  console.log('============================');
  console.log(`Target user: ${userEmail}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');
  
  // Confirm action
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const proceed = await new Promise(resolve => {
    rl.question(`⚠️  Are you sure you want to reset password for ${userEmail}? (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
  
  if (!proceed) {
    console.log('❌ Operation cancelled');
    process.exit(0);
  }
  
  // Perform password reset
  const result = await resetUserPassword(userEmail, supabaseAdmin);
  
  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  resetUserPassword,
  generateSecurePassword,
  logAdminAction
};
