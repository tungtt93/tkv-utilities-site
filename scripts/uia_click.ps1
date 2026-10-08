param(
  [Parameter(Mandatory = $true)][int64]$Hwnd,
  [Parameter(Mandatory = $true)][string]$NameFile
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$Name = [System.IO.File]::ReadAllText($NameFile, [System.Text.UTF8Encoding]::new($false)).Trim()
$ptr = [IntPtr]$Hwnd
if ($ptr -eq [IntPtr]::Zero) { Write-Output "BAD_HWND"; exit 2 }

$root = [System.Windows.Automation.AutomationElement]::FromHandle($ptr)
if (-not $root) { Write-Output "NO_ROOT"; exit 2 }

$nameCond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::NameProperty, $Name)
$btnCond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
  [System.Windows.Automation.ControlType]::Button)
$and = New-Object System.Windows.Automation.AndCondition($nameCond, $btnCond)
$els = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $and)
if ($els.Count -eq 0) {
  # Fallback: any control type
  $els = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $nameCond)
}
if ($els.Count -eq 0) { Write-Output "NOT_FOUND"; exit 3 }

# Prefer the leftmost button (sidebar nav over table headers).
$best = $null
$bestX = [double]::MaxValue
foreach ($e in $els) {
  $x = $e.Current.BoundingRectangle.X
  if ($x -ge 0 -and $x -lt $bestX) { $bestX = $x; $best = $e }
}
if (-not $best) { $best = $els[0] }

try {
  $inv = $best.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $inv.Invoke()
  Write-Output ("INVOKED x={0}" -f [int]$bestX)
  exit 0
} catch {
  $rect = $best.Current.BoundingRectangle
  $x = [int]($rect.X + $rect.Width / 2)
  $y = [int]($rect.Y + $rect.Height / 2)
  Add-Type -MemberDefinition @"
    [System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [System.Runtime.InteropServices.DllImport("user32.dll")] public static extern void mouse_event(int f, int dx, int dy, int d, int e);
"@ -Name U -Namespace N -PassThru | Out-Null
  [N.U]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 80
  [N.U]::mouse_event(0x0002, 0, 0, 0, 0)
  [N.U]::mouse_event(0x0004, 0, 0, 0, 0)
  Write-Output ("CLICKED {0},{1}" -f $x, $y)
  exit 0
}
