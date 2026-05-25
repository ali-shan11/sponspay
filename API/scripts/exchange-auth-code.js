#!/usr/bin/env node

/**
 * Zoho CRM Authorization Code Exchange Script
 * 
 * This script exchanges your authorization code for access and refresh tokens.
 * 
 * Reads configuration from environment variables:
 * - ZOHO_CLIENT_ID
 * - ZOHO_CLIENT_SECRET
 * - ZOHO_REDIRECT_URI
 * 
 * Usage:
 * node scripts/exchange-auth-code.js
 * 
 * Note: Make sure to set environment variables before running:
 * export ZOHO_CLIENT_ID=your_client_id
 * export ZOHO_CLIENT_SECRET=your_client_secret
 * export ZOHO_REDIRECT_URI=your_redirect_uri
 * 
 * Or run with variables:
 * ZOHO_CLIENT_ID=your_id ZOHO_CLIENT_SECRET=your_secret ZOHO_REDIRECT_URI=your_uri node scripts/exchange-auth-code.js
 */

const readline = require('readline');
const https = require('https');
const querystring = require('querystring');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function makeTokenRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    
    const options = {
      hostname: 'accounts.zoho.com',
      port: 443,
      path: '/oauth/v2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function exchangeAuthCode() {
  console.log('🔄 Zoho CRM Authorization Code Exchange\n');
  
  try {
    // Read from environment variables
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;
    
    // Validate required environment variables
    if (!clientId) {
      console.error('❌ Error: ZOHO_CLIENT_ID environment variable is required');
      console.log('Please set the environment variable:');
      console.log('export ZOHO_CLIENT_ID=your_client_id_here');
      process.exit(1);
    }
    
    if (!clientSecret) {
      console.error('❌ Error: ZOHO_CLIENT_SECRET environment variable is required');
      console.log('Please set the environment variable:');
      console.log('export ZOHO_CLIENT_SECRET=your_client_secret_here');
      process.exit(1);
    }
    
    if (!redirectUri) {
      console.error('❌ Error: ZOHO_REDIRECT_URI environment variable is required');
      console.log('Please set the environment variable:');
      console.log('export ZOHO_REDIRECT_URI=http://localhost:3000/oauth/callback');
      process.exit(1);
    }

    console.log('📋 Configuration loaded from environment variables:');
    console.log(`Client ID: ${clientId}`);
    console.log(`Redirect URI: ${redirectUri}`);
    console.log('Client Secret: [HIDDEN]');
    console.log('');
    
    // Only ask for the authorization code
    const authCode = await askQuestion('Enter the Authorization Code from the redirect URL: ');
    
    if (!authCode) {
      console.error('❌ Error: Authorization code is required');
      process.exit(1);
    }
    
    console.log('\n🔄 Exchanging authorization code for tokens...');
    
    const tokenData = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: authCode
    };
    
    const response = await makeTokenRequest(tokenData);
    
    if (response.error) {
      console.error('❌ Error from Zoho:', response.error);
      console.error('Description:', response.error_description || 'No description provided');
      
      // Provide helpful error messages
      if (response.error === 'invalid_code') {
        console.log('\n💡 Tip: The authorization code may have expired. Please generate a new one using:');
        console.log('node scripts/generate-zoho-auth-url.js');
      } else if (response.error === 'invalid_client') {
        console.log('\n💡 Tip: Check your ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET environment variables');
      } else if (response.error === 'redirect_uri_mismatch') {
        console.log('\n💡 Tip: Make sure ZOHO_REDIRECT_URI matches exactly what you configured in Zoho Developer Console');
      }
      
      process.exit(1);
    }
    
    if (response.access_token && response.refresh_token) {
      console.log('\n✅ Success! Here are your tokens:');
      console.log('=' .repeat(80));
      console.log('ACCESS TOKEN:', response.access_token);
      console.log('REFRESH TOKEN:', response.refresh_token);
      console.log('EXPIRES IN:', response.expires_in, 'seconds');
      console.log('TOKEN TYPE:', response.token_type);
      console.log('=' .repeat(80));
      
      console.log('\n📝 Add this to your .env file:');
      console.log('ZOHO_REFRESH_TOKEN=' + response.refresh_token);
      
      console.log('\n⚠️  Important:');
      console.log('- Store the REFRESH TOKEN securely - you\'ll need it for API calls');
      console.log('- The access token expires in 1 hour, but the refresh token is long-lived');
      console.log('- The service will automatically use the refresh token to get new access tokens');
      
    } else {
      console.error('❌ Unexpected response format:', response);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
exchangeAuthCode();
