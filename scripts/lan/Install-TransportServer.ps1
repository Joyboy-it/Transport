$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

function Fail([string]$Message) {
  Write-Host "ERROR: $Message" -ForegroundColor Red
  exit 1
}

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -Path $Path -Encoding UTF8) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $key = $Matches[1]
      $value = $Matches[2]
      if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") { $value = $Matches[1] }
      $values[$key] = $value
    }
  }
  $values
}

function Invoke-Npm([string[]]$Arguments) {
  Write-Host "> npm $($Arguments -join ' ')" -ForegroundColor Cyan
  & $NpmPath @Arguments
  if ($LASTEXITCODE -ne 0) { Fail "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE" }
}

if (-not (Test-IsAdmin)) {
  Fail "Run this from PowerShell opened with 'Run as administrator':`n  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
}

# --- Checks: nothing is changed until all of these pass ---

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Fail "Node.js 24 or newer is not installed (node.exe not found on PATH)." }
$NodePath = $nodeCmd.Source
if ($NodePath -like "*\AppData\*") {
  Fail "node.exe is installed for one user only ($NodePath). The boot task runs as SYSTEM; install Node.js for all users (C:\Program Files\nodejs)."
}
$nodeVersion = & $NodePath -p "process.versions.node"
if ([int]($nodeVersion.Split(".")[0]) -lt 24) { Fail "Node.js $nodeVersion found; version 24 or newer is required." }
$NodeDir = Split-Path -Parent $NodePath
$NpmPath = Join-Path $NodeDir "npm.cmd"
if (-not (Test-Path $NpmPath)) { Fail "npm.cmd not found next to node.exe in $NodeDir." }
$env:Path = "$NodeDir;$env:Path"

$envPath = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envPath)) { Fail "Missing $envPath. Copy .env.example to .env and fill in the values." }
$envValues = Read-EnvFile $envPath

$databaseUrl = $envValues["DATABASE_URL"]
if (-not $databaseUrl) { Fail "DATABASE_URL is not set in .env." }
try { $dbHost = ([Uri]$databaseUrl).Host } catch { Fail "DATABASE_URL in .env is not a valid URL." }
if ($dbHost -notin @("localhost", "127.0.0.1")) {
  Fail "DATABASE_URL must point to localhost or 127.0.0.1 (found '$dbHost'). PostgreSQL runs on this machine only."
}

if ($envValues["COOKIE_SECURE"] -ne "false") {
  Fail "COOKIE_SECURE must be `"false`" in .env. Browsers on the LAN use plain HTTP and would drop a secure session cookie."
}

$secret = $envValues["SESSION_SECRET"]
if (-not $secret -or $secret.Length -lt 32 -or $secret -like "CHANGE_ME*") {
  Fail "SESSION_SECRET in .env must be a random string of at least 32 characters."
}

$adminUser = "$($envValues["ADMIN_USERNAME"])".Trim()
$adminPassword = $envValues["ADMIN_PASSWORD"]
if (-not $adminUser -or -not $adminPassword -or $adminPassword.Length -lt 8 -or $adminPassword -eq "CHANGE_ME") {
  Fail "Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 8 characters in .env."
}

$storageRoot = $envValues["STORAGE_ROOT"]
if (-not $storageRoot) { Fail "STORAGE_ROOT is not set in .env." }
if (-not (Test-Path $storageRoot)) {
  New-Item -ItemType Directory -Force -Path $storageRoot | Out-Null
  Write-Host "Created storage folder $storageRoot"
}

# --- Build the app ---

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue }
Stop-TransportProcesses

Set-Location $ProjectRoot
Invoke-Npm @("install")
Invoke-Npm @("run", "db:deploy")
Invoke-Npm @("run", "db:seed")
Invoke-Npm @("run", "build")

# --- Firewall: web port only, never PostgreSQL ---

if (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue) {
  Write-Host "Firewall rule '$RuleName' already exists."
} else {
  New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort $Port -Profile Private, Domain | Out-Null
  Write-Host "Created firewall rule '$RuleName' (Private and Domain networks)."
}

$publicNets = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object NetworkCategory -eq "Public"
foreach ($net in $publicNets) {
  Write-Host "WARNING: network '$($net.Name)' on '$($net.InterfaceAlias)' is set to Public; other PCs cannot reach port $Port through it." -ForegroundColor Yellow
  Write-Host "         Change it to Private in Settings > Network & Internet if this is the office LAN." -ForegroundColor Yellow
}

$pgOpen = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalAddress -in @("0.0.0.0", "::") }
if ($pgOpen) {
  Write-Host "WARNING: PostgreSQL listens on all network interfaces (port 5432). The app only needs localhost;" -ForegroundColor Yellow
  Write-Host "         consider listen_addresses = 'localhost' in postgresql.conf. This script leaves it unchanged." -ForegroundColor Yellow
}

# --- Boot task ---

$startScript = Join-Path $PSScriptRoot "Start-TransportServer.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -WorkingDirectory $ProjectRoot `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -NodePath `"$NodePath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = "PT30S"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew `
  -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal `
  -Settings $settings -Description "Transport web app on port $Port for the LAN" -Force | Out-Null
Write-Host "Registered scheduled task '$TaskName' (runs at boot as SYSTEM)."

Start-ScheduledTask -TaskName $TaskName

$up = $false
for ($i = 0; $i -lt 15 -and -not $up; $i++) {
  Start-Sleep -Seconds 2
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5 | Out-Null
    $up = $true
  } catch [System.Net.WebException] {
    if ($_.Exception.Response) { $up = $true }
  } catch {}
}
if (-not $up) {
  Fail "The server did not answer on http://127.0.0.1:$Port within 30 seconds. Check logs\server.log."
}

# --- Tell the admin what to give the other PCs ---

$addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
Write-Host ""
Write-Host "Transport server is running. Open one of these from other PCs on the same network:" -ForegroundColor Green
foreach ($a in $addresses) {
  Write-Host "  http://$($a.IPAddress):$Port   ($($a.InterfaceAlias))"
}
if ($addresses | Where-Object PrefixOrigin -eq "Dhcp") {
  Write-Host ""
  Write-Host "Note: an address above comes from DHCP and may change after a restart." -ForegroundColor Yellow
  Write-Host "      Set a static IP on this PC or reserve the address in the router." -ForegroundColor Yellow
}
