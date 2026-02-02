# Activity Status Reporter for Windows
# This script detects the currently active window and reports it to your API

# ============ CONFIGURATION ============
$API_URL = "https://your-activity-api.vercel.app/api/activity"
$API_SECRET = "your-api-secret"
$REPORT_INTERVAL = 30  # Report every 30 seconds

# Blacklist: Apps that should not be reported (privacy)
$BLACKLIST = @(
    "Windows Security",
    "Settings",
    "Task Manager"
)

# App name mappings: Clean up ugly process names
$APP_NAME_MAP = @{
    "Code" = "VS Code"
    "Code - Insiders" = "VS Code Insiders"
    "devenv" = "Visual Studio"
    "chrome" = "Chrome"
    "msedge" = "Edge"
    "firefox" = "Firefox"
    "explorer" = "File Explorer"
    "Discord" = "Discord"
    "Spotify" = "Spotify"
    "WindowsTerminal" = "Terminal"
    "powershell" = "PowerShell"
    "cmd" = "CMD"
    "notepad" = "Notepad"
    "notepad++" = "Notepad++"
    "idea64" = "IntelliJ IDEA"
    "pycharm64" = "PyCharm"
    "webstorm64" = "WebStorm"
    "Telegram" = "Telegram"
    "WeChat" = "WeChat"
    "QQ" = "QQ"
}
# ========================================

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowTextLength(IntPtr hWnd);
}
"@

function Get-ActiveWindowInfo {
    $hwnd = [Win32]::GetForegroundWindow()
    
    if ($hwnd -eq [IntPtr]::Zero) {
        return $null
    }

    # Get window title
    $length = [Win32]::GetWindowTextLength($hwnd)
    $sb = New-Object System.Text.StringBuilder($length + 1)
    [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
    $windowTitle = $sb.ToString()

    # Get process info
    $processId = 0
    [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
    
    try {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            return @{
                ProcessName = $process.ProcessName
                WindowTitle = $windowTitle
                MainWindowTitle = $process.MainWindowTitle
            }
        }
    } catch {
        # Process might have exited
    }

    return $null
}

function Get-CleanAppName {
    param([hashtable]$WindowInfo)
    
    if (-not $WindowInfo) {
        return "Desktop"
    }

    $processName = $WindowInfo.ProcessName
    $windowTitle = $WindowInfo.WindowTitle

    # Check if in blacklist
    foreach ($blacklisted in $BLACKLIST) {
        if ($windowTitle -like "*$blacklisted*" -or $processName -like "*$blacklisted*") {
            return $null  # Skip this app
        }
    }

    # Check if we have a mapping
    foreach ($key in $APP_NAME_MAP.Keys) {
        if ($processName -like "*$key*" -or $windowTitle -like "*$key*") {
            return $APP_NAME_MAP[$key]
        }
    }

    # Try to get a clean name from window title
    # Many apps put their name at the end after " - "
    if ($windowTitle -match " - ([^-]+)$") {
        $extracted = $Matches[1].Trim()
        if ($extracted.Length -gt 2 -and $extracted.Length -lt 30) {
            return $extracted
        }
    }

    # Fallback to process name with some cleanup
    $cleanName = $processName -replace "64$", "" -replace "32$", ""
    return $cleanName.Substring(0, 1).ToUpper() + $cleanName.Substring(1)
}

function Send-ActivityReport {
    param([string]$AppName)
    
    if (-not $AppName) {
        return
    }

    $headers = @{
        "Authorization" = "Bearer $API_SECRET"
        "Content-Type" = "application/json"
    }

    $body = @{
        app = $AppName
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 10
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Reported: $AppName" -ForegroundColor Green
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Failed to report: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main loop
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Activity Status Reporter" -ForegroundColor Cyan
Write-Host " Reporting to: $API_URL" -ForegroundColor Gray
Write-Host " Interval: ${REPORT_INTERVAL}s" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$lastReportedApp = ""

while ($true) {
    $windowInfo = Get-ActiveWindowInfo
    $appName = Get-CleanAppName -WindowInfo $windowInfo

    # Only report if app changed or it's been a while
    if ($appName -and $appName -ne $lastReportedApp) {
        Send-ActivityReport -AppName $appName
        $lastReportedApp = $appName
    } elseif ($appName) {
        # Periodic report even if same app (to keep the status alive)
        Send-ActivityReport -AppName $appName
    }

    Start-Sleep -Seconds $REPORT_INTERVAL
}
