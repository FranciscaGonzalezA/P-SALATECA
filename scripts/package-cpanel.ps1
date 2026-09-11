Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseRoot = Join-Path $repositoryRoot 'release\cpanel'
$stagingRoot = Join-Path $releaseRoot '.staging'

# Keep the cPanel artifact deterministic: Vite embeds these values at build time.
# Without them, the browser falls back to localhost and cannot reach production.
$env:VITE_API_URL = 'https://api.rpayweb.cl/api/v1'
$env:VITE_DEMO_MODE = 'false'

Push-Location $repositoryRoot
try {
  & pnpm build
  if ($LASTEXITCODE -ne 0) {
    throw "La compilación de producción falló con código $LASTEXITCODE."
  }
}
finally {
  Pop-Location
}

if (-not $releaseRoot.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "La carpeta de salida está fuera del repositorio: $releaseRoot"
}

if (Test-Path -LiteralPath $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

$apiStage = Join-Path $stagingRoot 'api'
New-Item -ItemType Directory -Path (Join-Path $apiStage 'backend') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $apiStage 'database') -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $repositoryRoot 'deploy\cpanel\api\app.js') -Destination $apiStage
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'deploy\cpanel\api\package.json') -Destination $apiStage
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'backend\dist') -Destination (Join-Path $apiStage 'backend') -Recurse
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'deploy\cpanel\api\backend\package.json') -Destination (Join-Path $apiStage 'backend')
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'database\migrations') -Destination (Join-Path $apiStage 'database') -Recurse

$frontendStage = Join-Path $stagingRoot 'frontend'
New-Item -ItemType Directory -Path $frontendStage -Force | Out-Null
Copy-Item -Path (Join-Path $repositoryRoot 'frontend\dist\*') -Destination $frontendStage -Recurse -Force

$apiArchive = Join-Path $releaseRoot 'salateca-api.zip'
$frontendArchive = Join-Path $releaseRoot 'salateca-frontend.zip'

foreach ($archive in @($apiArchive, $frontendArchive)) {
  if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force
  }
}

Compress-Archive -Path (Join-Path $apiStage '*') -DestinationPath $apiArchive -CompressionLevel Optimal
Compress-Archive -Path (Join-Path $frontendStage '*') -DestinationPath $frontendArchive -CompressionLevel Optimal

Remove-Item -LiteralPath $stagingRoot -Recurse -Force

Write-Output $apiArchive
Write-Output $frontendArchive
