# Start Uthao business microservices in separate PowerShell windows.
# Prerequisites: JDK 21, Maven (mvn on PATH).
# Start Docker, Eureka, and API Gateway yourself before/after this script.
#
# Usage (from repo root):
#   .\start-all.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# Refresh env from registry (Cursor/old terminals often miss newly installed PATH entries)
$userMavenHome = [Environment]::GetEnvironmentVariable("MAVEN_HOME", "User")
$userJavaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
if ($userMavenHome) { $env:MAVEN_HOME = $userMavenHome }
if ($userJavaHome) { $env:JAVA_HOME = $userJavaHome }
if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Java\jdk-21")) {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
}

function Resolve-Maven {
    if (Get-Command mvn -ErrorAction SilentlyContinue) {
        return (Get-Command mvn).Source
    }
    if ($env:MAVEN_HOME) {
        $fromHome = Join-Path $env:MAVEN_HOME "bin\mvn.cmd"
        if (Test-Path $fromHome) { return $fromHome }
    }
    $candidates = @(
        "C:\apache-maven\apache-maven-3.9.16\bin\mvn.cmd",
        "C:\Program Files\Apache\maven\bin\mvn.cmd",
        "C:\apache-maven\bin\mvn.cmd",
        "$env:USERPROFILE\apache-maven\bin\mvn.cmd"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    $discovered = Get-ChildItem "C:\apache-maven" -Filter "mvn.cmd" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
    if ($discovered) { return $discovered }
    return $null
}

function Start-ServiceWindow {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceDir,
        [Parameter(Mandatory = $true)][string]$MvnPath
    )
    $servicePath = Join-Path $Root $ServiceDir
    if (-not (Test-Path $servicePath)) {
        Write-Error "Service folder not found: $servicePath"
    }
    $title = "Uthao - $ServiceDir"
    $javaHome = $env:JAVA_HOME
    $cmd = @"
`$Host.UI.RawUI.WindowTitle = '$title'
`$env:JAVA_HOME = '$javaHome'
Set-Location '$servicePath'
Write-Host 'Starting $ServiceDir ...' -ForegroundColor Cyan
& '$MvnPath' spring-boot:run
"@
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $cmd) | Out-Null
    Write-Host "  launched $ServiceDir"
}

$mvn = Resolve-Maven
if (-not $mvn) {
    Write-Host @"

Maven (mvn) was not found at the expected install path.

Expected: C:\apache-maven\apache-maven-3.9.16\bin\mvn.cmd

Close this terminal completely, open a new one, then run .\start-all.ps1 again.

"@ -ForegroundColor Red
    exit 1
}

$services = @(
    "identity-service",
    "rider-service",
    "driver-service",
    "matching-service",
    "trip-service",
    "payment-service",
    "notification-service"
)

Write-Host "Using Maven: $mvn" -ForegroundColor Green
Write-Host "Starting business services..." -ForegroundColor Cyan
Write-Host ""

foreach ($service in $services) {
    Start-ServiceWindow -ServiceDir $service -MvnPath $mvn
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All 7 services launched in separate windows." -ForegroundColor Green
Write-Host "Close each window (or Ctrl+C in it) to stop that service."
