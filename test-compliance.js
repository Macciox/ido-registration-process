// Test script per verificare le API di compliance
const fs = require('fs');
const path = require('path');

async function testComplianceAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Compliance API endpoints...\n');
  
  // Test 1: Check if API endpoints respond
  try {
    const response = await fetch(`${baseUrl}/api/compliance/templates`);
    console.log('✅ Templates endpoint:', response.status);
  } catch (error) {
    console.log('❌ Templates endpoint failed:', error.message);
  }
  
  // Test 2: Check database connection
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    console.log('✅ Health check:', response.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testComplianceAPI().catch(console.error);
}

module.exports = { testComplianceAPI };