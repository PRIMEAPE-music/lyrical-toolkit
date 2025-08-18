# Simple test script
$url = "http://localhost:8888/.netlify/functions/test-upload-comparison"
$filePath = "C:\Users\J\Desktop\WEBSITES\lyrical-toolkit\test.mp3"

Write-Host "Testing upload to $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method GET
    Write-Host "GET Response: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}