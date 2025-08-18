# PowerShell script to test multipart upload
$filePath = "C:\Users\J\Desktop\WEBSITES\lyrical-toolkit\test.mp3"
$url = "http://localhost:8888/.netlify/functions/test-upload-comparison"

Write-Host "🎵 Testing Upload with PowerShell" -ForegroundColor Cyan
Write-Host "📁 File: $filePath" -ForegroundColor Yellow

# Check if file exists
if (!(Test-Path $filePath)) {
    Write-Host "❌ File not found: $filePath" -ForegroundColor Red
    exit 1
}

try {
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $fileName = [System.IO.Path]::GetFileName($filePath)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: audio/mpeg",
        "",
        [System.Text.Encoding]::UTF8.GetString($fileBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"userId`"",
        "",
        "test-user-powershell",
        "--$boundary--"
    ) -join $LF
    
    $body = [System.Text.Encoding]::UTF8.GetBytes($bodyLines)
    
    Write-Host "📤 Sending POST request..." -ForegroundColor Yellow
    Write-Host "📋 Content-Type: multipart/form-data; boundary=$boundary" -ForegroundColor Gray
    Write-Host "📋 Body size: $($body.Length) bytes" -ForegroundColor Gray
    
    # Send request
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "multipart/form-data; boundary=$boundary" -UseBasicParsing
    
    Write-Host "✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📋 Response Headers:" -ForegroundColor Gray
    $response.Headers | ForEach-Object { Write-Host "   $($_.Key): $($_.Value)" -ForegroundColor Gray }
    
    Write-Host "📋 Response Body:" -ForegroundColor Yellow
    Write-Host $response.Content -ForegroundColor White
    
    # Try to parse as JSON
    try {
        $jsonResponse = $response.Content | ConvertFrom-Json
        Write-Host "✅ Response is valid JSON" -ForegroundColor Green
        Write-Host "📋 Success: $($jsonResponse.success)" -ForegroundColor $(if ($jsonResponse.success) { "Green" } else { "Red" })
    } catch {
        Write-Host "⚠️ Response is not valid JSON" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception)" -ForegroundColor Red
}