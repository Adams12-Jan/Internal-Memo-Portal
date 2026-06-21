param(
  [string]$ProjectId = $env:PROJECT_ID
)

if (-not $env:VERCEL_TOKEN) {
  Write-Error 'Please set VERCEL_TOKEN in your environment before running this script.'
  exit 1
}

if (-not $ProjectId) {
  Write-Error 'Please set PROJECT_ID in your environment or pass -ProjectId.'
  exit 1
}

$headers = @{ Authorization = "Bearer $($env:VERCEL_TOKEN)" }
try {
  $resp = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$ProjectId/env" -Headers $headers -ErrorAction Stop
  foreach ($e in $resp) {
    $targets = if ($e.target -is [System.Array]) { $e.target -join ',' } else { $e.target }
    Write-Output ("Key: " + $e.key + " | Target: " + $targets + " | Type: " + $e.type)
  }
} catch {
  Write-Error "Failed to list envs: $($_.Exception.Message)"
}

