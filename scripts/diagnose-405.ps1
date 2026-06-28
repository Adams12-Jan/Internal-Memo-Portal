# Diagnostic script to test the 405 error (Windows PowerShell)

Write-Host "=== Internal Memo Portal - 405 Error Diagnostic ===" -ForegroundColor Yellow

# Get URLs from user
$BackendUrl = Read-Host "Enter Render backend URL (e.g., https://internal-memo-api.onrender.com)"
$FrontendUrl = Read-Host "Enter Vercel frontend URL (e.g., https://your-project.vercel.app)"

# Clean URLs (remove trailing slash)
$BackendUrl = $BackendUrl.TrimEnd('/')
$FrontendUrl = $FrontendUrl.TrimEnd('/')

Write-Host "`nTesting Backend..." -ForegroundColor Yellow

# Test 1: Health check
Write-Host "`n1. Health Check:"
try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/status" -Method Get -ErrorAction Stop
    Write-Host "✓ Backend is running" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend returned error" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "  Problem: Backend not responding or offline"
}

# Test 2: Login endpoint exists (try POST)
Write-Host "`n2. Login Endpoint (POST):"
try {
    $body = @{
        email = "test@test.com"
        password = "test"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✓ Endpoint exists" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 400 -or $statusCode -eq 401) {
        Write-Host "✓ Endpoint exists (returned $statusCode - expected for bad credentials)" -ForegroundColor Green
    } elseif ($statusCode -eq 405) {
        Write-Host "✗ Method Not Allowed (405)" -ForegroundColor Red
        Write-Host "  Problem: Backend doesn't accept POST to /api/auth/login" -ForegroundColor Red
    } elseif ($statusCode -eq 404) {
        Write-Host "✗ Route not found (404)" -ForegroundColor Red
        Write-Host "  Problem: /api/auth/login route doesn't exist" -ForegroundColor Red
    } else {
        Write-Host "? Unexpected status: $statusCode" -ForegroundColor Yellow
    }
}

# Test 3: CORS check
Write-Host "`n3. CORS Headers (OPTIONS request):"
try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/login" `
        -Method Options `
        -Headers @{
            "Origin" = $FrontendUrl
            "Access-Control-Request-Method" = "POST"
        } `
        -ErrorAction Stop
    
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "✓ CORS enabled: $corsHeader" -ForegroundColor Green
    } else {
        Write-Host "✗ CORS header missing" -ForegroundColor Red
        Write-Host "  Problem: CORS_ORIGIN not configured on backend" -ForegroundColor Red
        Write-Host "  Solution: Set CORS_ORIGIN=$FrontendUrl on Render" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ CORS check failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Environment variable check
Write-Host "`nTesting Frontend Configuration..." -ForegroundColor Yellow
Write-Host "`n4. Checking VITE_API_URL:"
Write-Host "  Go to Vercel Dashboard → Project → Settings → Environment Variables"
Write-Host "  Verify VITE_API_URL is set to: $BackendUrl"
Write-Host "  If not set, that's why you get 405 (requests go to static server)"

# Test 5: Full login simulation
Write-Host "`n5. Simulating Login Request:" -ForegroundColor Cyan
Write-Host "  POST $BackendUrl/api/auth/login"
Write-Host "  Origin: $FrontendUrl"

try {
    $body = @{
        email = "test@test.com"
        password = "wrongpassword"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ "Origin" = $FrontendUrl } `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "`nResponse Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✓ Endpoint working" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $responseBody = $_.Exception.Response.Content.ReadAsString()
    
    Write-Host "`nResponse Status: $statusCode" -ForegroundColor Cyan
    
    if ($statusCode -eq 405) {
        Write-Host "✗ 405 Error Detected!" -ForegroundColor Red
        Write-Host "  Possible causes:" -ForegroundColor Yellow
        Write-Host "  1. Backend not deployed on Render" -ForegroundColor Yellow
        Write-Host "  2. Frontend not sending POST (check authClient.ts)" -ForegroundColor Yellow
        Write-Host "  3. Wrong endpoint path (check server.ts routes)" -ForegroundColor Yellow
    } elseif ($statusCode -eq 401) {
        Write-Host "✓ Endpoint working (rejected for bad credentials - expected)" -ForegroundColor Green
    } elseif ($statusCode -eq 500) {
        Write-Host "? Server error (500)" -ForegroundColor Yellow
        Write-Host "  Check Render logs for server errors" -ForegroundColor Yellow
    } elseif ($statusCode -eq 404) {
        Write-Host "✗ Route not found (404)" -ForegroundColor Red
    }
    
    if ($responseBody) {
        Write-Host "`nResponse: $responseBody" -ForegroundColor Cyan
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Yellow
Write-Host "Backend: $BackendUrl" -ForegroundColor Cyan
Write-Host "Frontend: $FrontendUrl" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Green
Write-Host "1. Verify VITE_API_URL is set in Vercel to: $BackendUrl" -ForegroundColor Cyan
Write-Host "2. Verify CORS_ORIGIN is set in Render to: $FrontendUrl" -ForegroundColor Cyan
Write-Host "3. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor Cyan
Write-Host "4. Check DevTools Network tab for actual request URL" -ForegroundColor Cyan
Write-Host "5. Check Render logs if backend errors occur" -ForegroundColor Cyan
