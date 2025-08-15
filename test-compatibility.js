// Node.js compatibility test for authentication functions
const crypto = require('crypto');

console.log('Testing Node.js compatibility for Netlify authentication...');

// Test 1: Base64URL encoding/decoding
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(str) {
    // Add padding if needed
    str += '='.repeat((4 - str.length % 4) % 4);
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(str, 'base64').toString();
}

console.log('✓ Testing base64url encoding...');
const testString = 'Hello World!';
const encoded = base64UrlEncode(testString);
const decoded = base64UrlDecode(encoded);
console.log('  Original:', testString);
console.log('  Encoded:', encoded);
console.log('  Decoded:', decoded);
console.log('  Match:', testString === decoded ? '✓' : '✗');

// Test 2: HMAC signature generation
console.log('✓ Testing HMAC signature generation...');
const secret = 'test-secret';
const data = 'test-data';
const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
console.log('  Signature generated:', signature.length > 0 ? '✓' : '✗');

// Test 3: JSON operations
console.log('✓ Testing JSON operations...');
const testObj = { test: true, timestamp: new Date().toISOString() };
const jsonString = JSON.stringify(testObj);
const parsedObj = JSON.parse(jsonString);
console.log('  JSON round-trip:', parsedObj.test === true ? '✓' : '✗');

// Test 4: Promise handling
console.log('✓ Testing Promise handling...');
function testPromise() {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve('Promise resolved');
        }, 10);
    });
}

testPromise().then(function(result) {
    console.log('  Promise result:', result === 'Promise resolved' ? '✓' : '✗');
    console.log('All compatibility tests completed!');
}).catch(function(error) {
    console.error('  Promise test failed:', error);
});

console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);