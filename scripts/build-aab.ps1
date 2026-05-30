$projectRoot = Resolve-Path "$PSScriptRoot\.."
$versionFile = "$projectRoot\.version"
$buildGradle = "$projectRoot\android\app\build.gradle"

# Read version file
$lines = Get-Content $versionFile
$versionCode = 0; $versionName = ""; $buildNumber = 0
foreach ($line in $lines) {
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) {
        $key = $parts[0].Trim()
        $val = $parts[1].Trim()
        if ($key -eq "VERSION_CODE") { $versionCode = [int]$val }
        if ($key -eq "VERSION_NAME") { $versionName = $val }
        if ($key -eq "BUILD_NUMBER") { $buildNumber = [int]$val }
    }
}

# Increment
$newBuildNumber = $buildNumber + 1
$newVersionCode = $versionCode + 1
$newVersionLabel = "$versionName.b$newBuildNumber"

Write-Host "=== Building AAB ===" -ForegroundColor Cyan
Write-Host "Version Code : $versionCode -> $newVersionCode" -ForegroundColor Yellow
Write-Host "Version Name : $versionName -> $newVersionLabel" -ForegroundColor Yellow
Write-Host "Build Number : $buildNumber -> $newBuildNumber" -ForegroundColor Yellow

# Update .version file
@"
VERSION_CODE=$newVersionCode
VERSION_NAME=$versionName
BUILD_NUMBER=$newBuildNumber
"@ | Set-Content $versionFile -NoNewline

# Update build.gradle
$content = Get-Content $buildGradle -Raw
$content = $content -replace 'versionCode \d+', "versionCode $newVersionCode"
$content = $content -replace 'versionName ".*?"', "versionName `"$newVersionLabel`""
Set-Content $buildGradle -Value $content -NoNewline

# Build
Write-Host "`nRunning Gradle bundleRelease..." -ForegroundColor Cyan
Push-Location "$projectRoot\android"
try {
    $result = ./gradlew bundleRelease 2>&1
    $result | Out-String | Write-Host

    $aabPath = "$projectRoot\android\app\build\outputs\bundle\release\app-release.aab"
    $distDir = "$projectRoot\dist\aab"
    if (-not (Test-Path $distDir)) {
        New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    }
    $outputName = "ControleFinanceiro-v$newVersionLabel.aab"
    $outputPath = "$distDir\$outputName"
    Copy-Item $aabPath $outputPath -Force

    Write-Host "`n=== AAB GERADO ===" -ForegroundColor Green
    Write-Host "Arquivo: $outputPath" -ForegroundColor Green
    Write-Host "Versão : $newVersionLabel" -ForegroundColor Green
} finally {
    Pop-Location
}
