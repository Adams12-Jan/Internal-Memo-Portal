param(
  [string]$EnvFile = '.env.local',
  [switch]$TriggerDeployment
)

if (-not $env:VERCEL_TOKEN) {
  Write-Error 'Please set VERCEL_TOKEN in your environment before running this script.'
  exit 1
}

if (-not $env:PROJECT_ID) {
  Write-Error 'Please set PROJECT_ID in your environment before running this script.'
  exit 1
}

$headers = @{ Authorization = "Bearer $($env:VERCEL_TOKEN)"; 'Content-Type' = 'application/json' }
$envPath = Resolve-Path -Path $EnvFile -ErrorAction Stop
Write-Output "Loading env variables from $envPath"

function Parse-EnvFile {
  param([string]$Path)
  $result = @{}
  foreach ($line in Get-Content -Path $Path) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) { continue }
    $sepIndex = $trimmed.IndexOf('=')
    if ($sepIndex -lt 0) { continue }
    $key = $trimmed.Substring(0, $sepIndex).Trim()
    $value = $trimmed.Substring($sepIndex + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ($key) { $result[$key] = $value }
  }
  return $result
}

$envVars = Parse-EnvFile -Path $envPath
$selectedKeys = $envVars.Keys | Where-Object { $_ -like 'VITE_*' -or $_ -eq 'NODE_ENV' }
if (-not $selectedKeys) {
  Write-Error 'No VITE_* or NODE_ENV variables were found in the env file.'
  exit 1
}

try {
  $existing = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$($env:PROJECT_ID)/env" -Headers $headers -ErrorAction Stop
} catch {
  Write-Error "Failed to fetch existing Vercel env vars: $($_.Exception.Message)"
  exit 1
}

foreach ($key in $selectedKeys) {
  $value = $envVars[$key]
  $body = @{ key = $key; value = $value; target = @('production'); type = 'encrypted' } | ConvertTo-Json -Compress
  $existingItem = $null
  if ($existing) {
    $existingItem = $existing | Where-Object { $_.key -eq $key -and ($_.target -contains 'production') }
  }

  if ($existingItem) {
    if ($existingItem -is [System.Array]) {
      $existingItem = $existingItem[0]
    }

    try {
      Write-Output "Updating $key..."
      Invoke-RestMethod -Method Patch -Uri "https://api.vercel.com/v9/projects/$($env:PROJECT_ID)/env/$($existingItem.uid)" -Headers $headers -Body $body -ErrorAction Stop
      Write-Output "Updated $key"
    } catch {
      Write-Error "Failed to update ${key}: $($_.Exception.Message)"
    }
  } else {
    try {
      Write-Output "Creating $key..."
      Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v9/projects/$($env:PROJECT_ID)/env" -Headers $headers -Body $body -ErrorAction Stop
      Write-Output "Created $key"
    } catch {
      Write-Error "Failed to create ${key}: $($_.Exception.Message)"
    }
  }
}

if ($TriggerDeployment.IsPresent) {
  try {
    Write-Output 'Triggering production deployment...'
    $deployBody = @{ name = 'internal-memo-portal'; target = 'production'; project = $env:PROJECT_ID } | ConvertTo-Json -Compress
    $deployResp = Invoke-RestMethod -Method Post -Uri 'https://api.vercel.com/v13/deployments' -Headers $headers -Body $deployBody -ErrorAction Stop
    if ($deployResp.url) {
      Write-Output "Deployment triggered: $($deployResp.url)"
    } else {
      Write-Output "Deployment trigger response: $($deployResp | ConvertTo-Json -Compress)"
    }
  } catch {
    Write-Error "Deployment trigger failed: $($_.Exception.Message)"
  }
} else {
  Write-Output 'Deployment trigger skipped. Add -TriggerDeployment to run a production deploy after env sync.'
}