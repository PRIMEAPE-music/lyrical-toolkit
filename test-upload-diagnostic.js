// Test script to call the upload diagnostic function
const https = require('https');

async function testDiagnostic() {
  console.log('🔍 Testing upload diagnostic function...');
  
  try {
    const response = await fetch('https://lyrical-toolkit.com/.netlify/functions/upload-debug', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (response.ok) {
      const diagnostics = await response.json();
      console.log('📊 === DIAGNOSTIC RESULTS ===');
      console.log(JSON.stringify(diagnostics, null, 2));
      
      // Highlight key issues
      if (diagnostics.errors && diagnostics.errors.length > 0) {
        console.log('\n❌ === ISSUES FOUND ===');
        diagnostics.errors.forEach(error => console.log('  •', error));
      }
      
      if (!diagnostics.environment?.supabaseUrlValid) {
        console.log('\n⚠️ SUPABASE_URL issue detected');
      }
      
      if (!diagnostics.environment?.supabaseKeyValid) {
        console.log('\n⚠️ SUPABASE_SERVICE_KEY issue detected');
      }
      
      if (!diagnostics.supabase?.connectionWorking) {
        console.log('\n❌ Supabase connection not working');
      }
      
    } else {
      const errorText = await response.text();
      console.error('❌ Diagnostic failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDiagnostic();