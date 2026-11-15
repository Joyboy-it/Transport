param(
  [Parameter(Mandatory = $true)][string]$NodePath
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

if (Test-PortListening $Port) {
  Write-Host "Port $Port is already in use; not starting a second server."
  exit 0
}

$nodeDir = Split-Path -Parent $NodePath
$env:Path = "$nodeDir;$env:Path"
Set-Location $ProjectRoot

$logDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "server.log"

Add-Content -Path $log -Value "`r`n=== $(Get-Date -Format s) starting Transport server ===" -Encoding ASCII

# cmd.exe redirection keeps npm output as raw bytes; Windows PowerShell 5.1 would rewrite it as UTF-16.
& cmd.exe /d /c "`"$nodeDir\npm.cmd`" run start >> `"$log`" 2>&1"
exit $LASTEXITCODE
