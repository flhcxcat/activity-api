# Activity Status Reporter for Windows
# This script detects the currently active window and reports it to your API

# ============ CONFIGURATION ============
$API_URL = "https://activity-api-chi.vercel.app/api/activity"
$API_SECRET = "your-api-secret"  # 改成你在Vercel设置的API_SECRET
$REPORT_INTERVAL = 30  # Report every 30 seconds

# Blacklist: Apps that should not be reported (privacy)
$BLACKLIST = @(
    "Windows Security",
    "Settings",
    "Task Manager"
)

# App name mappings: Clean up ugly process names
$APP_NAME_MAP = @{
    # IDEs & Editors
    "Code"              = "VS Code"
    "Code - Insiders"   = "VS Code Insiders"
    "devenv"            = "Visual Studio"
    "idea64"            = "IntelliJ IDEA"
    "pycharm64"         = "PyCharm"
    "webstorm64"        = "WebStorm"
    "clion64"           = "CLion"
    "goland64"          = "GoLand"
    "rider64"           = "Rider"
    "datagrip64"        = "DataGrip"
    "phpstorm64"        = "PhpStorm"
    "rubymine64"        = "RubyMine"
    "notepad"           = "Notepad"
    "notepad++"         = "Notepad++"
    "sublime_text"      = "Sublime Text"
    "atom"              = "Atom"
    "vim"               = "Vim"
    "nvim"              = "Neovim"
    "emacs"             = "Emacs"
    
    # Browsers
    "chrome"            = "Chrome"
    "msedge"            = "Edge"
    "firefox"           = "Firefox"
    "opera"             = "Opera"
    "brave"             = "Brave"
    "vivaldi"           = "Vivaldi"
    "arc"               = "Arc"
    
    # Terminals
    "WindowsTerminal"   = "Terminal"
    "powershell"        = "PowerShell"
    "pwsh"              = "PowerShell"
    "cmd"               = "CMD"
    "mintty"            = "Git Bash"
    "ConEmu64"          = "ConEmu"
    "Hyper"             = "Hyper"
    "Tabby"             = "Tabby"
    "Alacritty"         = "Alacritty"
    "wezterm"           = "WezTerm"
    
    # Communication
    "Discord"           = "Discord"
    "Telegram"          = "Telegram"
    "WeChat"            = "WeChat"
    "QQ"                = "QQ"
    "Slack"             = "Slack"
    "Teams"             = "Microsoft Teams"
    "Zoom"              = "Zoom"
    "Skype"             = "Skype"
    "Element"           = "Element"
    "Signal"            = "Signal"
    "LINE"              = "LINE"
    
    # Media & Entertainment
    "Spotify"           = "Spotify"
    "AIMP"              = "AIMP"
    "foobar2000"        = "foobar2000"
    "iTunes"            = "iTunes"
    "vlc"               = "VLC"
    "PotPlayer"         = "PotPlayer"
    "mpv"               = "mpv"
    "Netflix"           = "Netflix"
    "Bilibili"          = "Bilibili"
    
    # Gaming
    "Steam"             = "Steam"
    "EpicGamesLauncher" = "Epic Games"
    "Origin"            = "Origin"
    "Battle.net"        = "Battle.net"
    "Uplay"             = "Ubisoft Connect"
    "GenshinImpact"     = "Genshin Impact"
    "StarRail"          = "Honkai: Star Rail"
    "ZenlessZoneZero"   = "Zenless Zone Zero"
    "League of Legends" = "League of Legends"
    "Valorant"          = "Valorant"
    "Minecraft"         = "Minecraft"
    "osu!"              = "osu!"
    
    # Design & Creative
    "Photoshop"         = "Photoshop"
    "Illustrator"       = "Illustrator"
    "AfterFX"           = "After Effects"
    "PremierePro"       = "Premiere Pro"
    "Figma"             = "Figma"
    "Sketch"            = "Sketch"
    "Blender"           = "Blender"
    "GIMP"              = "GIMP"
    "Inkscape"          = "Inkscape"
    "Krita"             = "Krita"
    "DaVinciResolve"    = "DaVinci Resolve"
    "OBS64"             = "OBS Studio"
    "Canva"             = "Canva"
    
    # Productivity
    "WINWORD"           = "Word"
    "EXCEL"             = "Excel"
    "POWERPNT"          = "PowerPoint"
    "ONENOTE"           = "OneNote"
    "OUTLOOK"           = "Outlook"
    "Notion"            = "Notion"
    "Obsidian"          = "Obsidian"
    "Typora"            = "Typora"
    "Logseq"            = "Logseq"
    "Roam"              = "Roam Research"
    "Todoist"           = "Todoist"
    "TickTick"          = "TickTick"
    
    # Development Tools
    "docker"            = "Docker"
    "Postman"           = "Postman"
    "Insomnia"          = "Insomnia"
    "GitHubDesktop"     = "GitHub Desktop"
    "SourceTree"        = "SourceTree"
    "Fork"              = "Fork"
    "TablePlus"         = "TablePlus"
    "DataGrip"          = "DataGrip"
    "MongoDB"           = "MongoDB Compass"
    "RedisInsight"      = "Redis Insight"
    "HeidiSQL"          = "HeidiSQL"
    "Navicat"           = "Navicat"
    
    # System & Utilities
    "explorer"          = "File Explorer"
    "Everything"        = "Everything"
    "7zFM"              = "7-Zip"
    "WinRAR"            = "WinRAR"
    "Snipaste"          = "Snipaste"
    "ShareX"            = "ShareX"
    "PicGo"             = "PicGo"
    "Clash"             = "Clash"
    "v2rayN"            = "v2rayN"
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
                ProcessName     = $process.ProcessName
                WindowTitle     = $windowTitle
                MainWindowTitle = $process.MainWindowTitle
            }
        }
    }
    catch {
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

    # Try to extract from beginning of title (before " - ")
    if ($windowTitle -match "^([^-|—]+)") {
        $extracted = $Matches[1].Trim()
        # If it looks like a file path or document name, skip
        if ($extracted.Length -gt 2 -and $extracted.Length -lt 25 -and 
            $extracted -notmatch "^[A-Z]:\\" -and 
            $extracted -notmatch "\.(txt|doc|pdf|md|js|py|html)$") {
            # Check if it's just the app name (not a document title)
            if ($extracted -match "^\w+$" -or $extracted -match "^[\w\s]+$") {
                return $extracted
            }
        }
    }

    # Fallback to process name with smart cleanup
    $cleanName = $processName
    
    # Remove common suffixes
    $cleanName = $cleanName -replace "64$", ""
    $cleanName = $cleanName -replace "32$", ""
    $cleanName = $cleanName -replace "\.exe$", ""
    $cleanName = $cleanName -replace "App$", ""
    $cleanName = $cleanName -replace "Application$", ""
    
    # Handle CamelCase: insert spaces (e.g., "MyAppName" -> "My App Name")
    $cleanName = $cleanName -creplace '([a-z])([A-Z])', '$1 $2'
    
    # Handle consecutive uppercase (e.g., "VSCode" -> "VS Code")
    $cleanName = $cleanName -creplace '([A-Z]+)([A-Z][a-z])', '$1 $2'
    
    # Handle underscore and hyphen separators
    $cleanName = $cleanName -replace '_', ' '
    $cleanName = $cleanName -replace '-', ' '
    
    # Capitalize first letter of each word
    $words = $cleanName -split '\s+' | Where-Object { $_ -ne "" }
    $result = ($words | ForEach-Object {
            if ($_.Length -gt 0) {
                $_.Substring(0, 1).ToUpper() + $_.Substring(1)
            }
        }) -join ' '
    
    # Clean up extra spaces
    $result = $result -replace '\s+', ' '
    $result = $result.Trim()
    
    if ($result.Length -gt 0) {
        return $result
    }
    
    return $processName
}

function Send-ActivityReport {
    param([string]$AppName)
    
    if (-not $AppName) {
        return
    }

    $headers = @{
        "Authorization" = "Bearer $API_SECRET"
        "Content-Type"  = "application/json"
    }

    $body = @{
        app = $AppName
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 10
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Reported: $AppName" -ForegroundColor Green
    }
    catch {
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
    }
    elseif ($appName) {
        # Periodic report even if same app (to keep the status alive)
        Send-ActivityReport -AppName $appName
    }

    Start-Sleep -Seconds $REPORT_INTERVAL
}
