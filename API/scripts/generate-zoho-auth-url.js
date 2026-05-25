#!/usr/bin/env node

/**
 * Zoho CRM Authorization URL Generator
 * 
 * This script helps you generate the authorization URL needed to get
 * the authorization code, which you'll then exchange for a refresh token.
 * 
 * Reads configuration from environment variables:
 * - ZOHO_CLIENT_ID
 * - ZOHO_REDIRECT_URI
 * 
 * Usage:
 * node scripts/generate-zoho-auth-url.js
 * 
 * Note: Make sure to set environment variables before running:
 * export ZOHO_CLIENT_ID=your_client_id
 * export ZOHO_REDIRECT_URI=your_redirect_uri
 * 
 * Or run with variables:
 * ZOHO_CLIENT_ID=your_id ZOHO_REDIRECT_URI=your_uri node scripts/generate-zoho-auth-url.js
 */

function generateAuthUrl() {
  console.log('🔐 Zoho CRM Authorization URL Generator\n');
  
  try {
    // Read from environment variables
    const clientId = process.env.ZOHO_CLIENT_ID;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;
    
    // Validate required environment variables
    if (!clientId) {
      console.error('❌ Error: ZOHO_CLIENT_ID environment variable is required');
      console.log('Please set the environment variable:');
      console.log('export ZOHO_CLIENT_ID=your_client_id_here');
      console.log('');
      console.log('Or run with the variable:');
      console.log('ZOHO_CLIENT_ID=your_id ZOHO_REDIRECT_URI=your_uri node scripts/generate-zoho-auth-url.js');
      process.exit(1);
    }
    
    if (!redirectUri) {
      console.error('❌ Error: ZOHO_REDIRECT_URI environment variable is required');
      console.log('Please set the environment variable:');
      console.log('export ZOHO_REDIRECT_URI=http://localhost:3000/oauth/callback');
      console.log('');
      console.log('Or run with the variable:');
      console.log('ZOHO_CLIENT_ID=your_id ZOHO_REDIRECT_URI=your_uri node scripts/generate-zoho-auth-url.js');
      process.exit(1);
    }
    
    // Use scope for both contacts and leads management
    const scope = 'ZohoCRM.modules.contacts.ALL,ZohoCRM.modules.leads.ALL';
    
    console.log('📋 Configuration:');
    console.log(`Client ID: ${clientId}`);
    console.log(`Redirect URI: ${redirectUri}`);
    console.log(`Scope: ${scope}`);
    console.log('');
    
    // URL encode the parameters
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const encodedScope = encodeURIComponent(scope);
    
    // Generate the authorization URL
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${encodedScope}&client_id=${clientId}&response_type=code&redirect_uri=${encodedRedirectUri}&access_type=offline`;
    
    console.log('✅ Generated Authorization URL:');
    console.log('=' .repeat(80));
    console.log(authUrl);
    console.log('=' .repeat(80));
    
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the URL above and paste it in your browser');
    console.log('2. Log in to your Zoho account and grant permissions');
    console.log('3. You\'ll be redirected to your redirect URI with a "code" parameter');
    console.log('4. Copy the authorization code from the URL');
    console.log('5. Use the code to get your refresh token with: node scripts/exchange-auth-code.js');
    
    console.log('\n💡 Example redirect URL:');
    console.log(`${redirectUri}?code=1000.abc123def456...&location=us&accounts-server=https%3A%2F%2Faccounts.zoho.com`);
    console.log('\nCopy the value after "code=" (everything before the next &)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
generateAuthUrl();
