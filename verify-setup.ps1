# DataManagementOrbi - Setup Verification Script
# Run this to verify the restructure is working correctly

Write-Host "=== DataManagementOrbi Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend (port 3001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -ErrorAction Stop
    $health = $response.Content | ConvertFrom-Json
    if ($health.status -eq "ok") {
        Write-Host "   ✅ Backend is running and healthy" -ForegroundColor Green
        Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Backend is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Start it with: cd backend; npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Check if frontend is running
Write-Host "2. Checking frontend (port 5173)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Frontend is not responding" -ForegroundColor Red
    Write-Host "   Start it with: cd frontend; npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Check backend endpoints (requires auth, so we just check they exist)
Write-Host "3. Checking backend routes..." -ForegroundColor Yellow

$endpoints = @(
    @{ Path = "/api/health"; Auth = $false; Expected = 200 },
    @{ Path = "/api/reports"; Auth = $true; Expected = 401 },
    @{ Path = "/api/admin/reports"; Auth = $true; Expected = 401 },
    @{ Path = "/api/auth/login"; Auth = $false; Expected = 400 }  # POST endpoint, GET will fail
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001$($endpoint.Path)" -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq $endpoint.Expected) {
            Write-Host "   ✅ $($endpoint.Path)" -ForegroundColor Green
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq $endpoint.Expected) {
            Write-Host "   ✅ $($endpoint.Path) (auth required)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $($endpoint.Path) - Got $status, expected $($endpoint.Expected)" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Check files exist
Write-Host "4. Verifying restructured files..." -ForegroundColor Yellow
$files = @(
    "backend\src\routes\admin-reports.routes.ts",
    "backend\src\routes\embed.routes.ts",
    "frontend\src\hooks\useApi.ts",
    "frontend\src\components\Toast.tsx",
    "frontend\src\contexts\ToastContext.tsx"
)

$allExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file NOT FOUND" -ForegroundColor Red
        $allExist = $false
    }
}
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allExist) {
    Write-Host "All restructured files are in place ✅" -ForegroundColor Green
} else {
    Write-Host "Some files are missing ❌" -ForegroundColor Red
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open browser at http://localhost:5173" -ForegroundColor Gray
Write-Host "2. Login with your credentials" -ForegroundColor Gray
Write-Host "3. Test the admin pages (Users, Reports, Permissions, PowerBI)" -ForegroundColor Gray
Write-Host "4. Verify error messages appear when backend is stopped" -ForegroundColor Gray
Write-Host "5. Verify toast notifications appear on save/delete actions" -ForegroundColor Gray
Write-Host ""
Write-Host "Read RESTRUCTURE_SUMMARY.md for full details." -ForegroundColor Cyan
