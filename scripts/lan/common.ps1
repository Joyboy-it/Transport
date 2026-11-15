$TaskName = "TransportServer"
$RuleName = "Transport web (TCP 3000)"
$Port = 3000
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Test-IsAdmin {
  $principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
  $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-PortListening([int]$LocalPort) {
  [bool](Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue)
}

function Stop-TransportProcesses {
  $nextDir = Join-Path $ProjectRoot "node_modules\next"
  $procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($nextDir, [StringComparison]::OrdinalIgnoreCase) -ge 0 }
  foreach ($p in $procs) {
    Write-Host "Stopping Next.js process $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
