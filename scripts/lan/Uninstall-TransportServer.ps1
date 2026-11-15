$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

if (-not (Test-IsAdmin)) {
  Write-Host "ERROR: Run this from PowerShell opened with 'Run as administrator':" -ForegroundColor Red
  Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit 1
}

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task '$TaskName'."
} else {
  Write-Host "Scheduled task '$TaskName' was not installed."
}

Stop-TransportProcesses

$rule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($rule) {
  $rule | Remove-NetFirewallRule
  Write-Host "Removed firewall rule '$RuleName'."
} else {
  Write-Host "Firewall rule '$RuleName' was not installed."
}

Write-Host "Database, .env, logs and STORAGE_ROOT were left untouched."
