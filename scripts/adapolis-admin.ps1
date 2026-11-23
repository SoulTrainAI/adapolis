# ADApolis admin menu for Windows PowerShell.
# Asks for CRON_SECRET once and keeps it encrypted for your Windows account only
# (Windows DPAPI), so you never paste it again. Run: right-click -> Run with PowerShell.

$ErrorActionPreference = 'Stop'
$Site = 'https://www.adapolis.net'
$Store = Join-Path $env:APPDATA 'ADApolis\cron-secret.txt'

function Get-Secret {
    if (Test-Path $Store) {
        $secure = Get-Content $Store | ConvertTo-SecureString
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    }
    Write-Host ''
    Write-Host 'First run: copy CRON_SECRET from Railway (copy icon on the CRON_SECRET row),' -ForegroundColor Yellow
    Read-Host  'then come back here and press Enter'
    $raw = ((Get-Clipboard) -join "`n")
    $line = ($raw -split "`n" | Where-Object { $_ -match 'CRON_SECRET' }) | Select-Object -First 1
    $value = if ($line) { ($line -split '=', 2)[1] } else { $raw }
    $value = $value.Trim().Trim('"') -replace '[\x00-\x1F\s]', ''
    if ($value.Length -ne 32) {
        Write-Host "That clipboard value is $($value.Length) characters; CRON_SECRET is 32. Copy it again and rerun." -ForegroundColor Red
        exit 1
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $Store) | Out-Null
    $value | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Set-Content $Store
    Set-Clipboard -Value ' '
    Write-Host 'Saved (encrypted for your Windows account). Clipboard cleared.' -ForegroundColor Green
    return $value
}

function Invoke-Admin([string]$Path) {
    $headers = @{ Authorization = "Bearer $(Get-Secret)" }
    Write-Host "POST $Path ..." -ForegroundColor Cyan
    try {
        $r = Invoke-WebRequest -Method Post -Uri "$Site$Path" -Headers $headers -TimeoutSec 300 -UseBasicParsing
        Write-Host "Status: $($r.StatusCode)" -ForegroundColor Green
        $body = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    } catch {
        $resp = $_.Exception.Response
        if (-not $resp) { Write-Host $_.Exception.Message -ForegroundColor Red; return }
        Write-Host "Status: $([int]$resp.StatusCode)" -ForegroundColor Red
        $body = (New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)).ReadToEnd()
        if ([int]$resp.StatusCode -eq 401) { Write-Host 'Secret rejected. Choose R to re-enter it.' -ForegroundColor Yellow }
    }
    try { $body | ConvertFrom-Json | ConvertTo-Json -Depth 6 } catch { $body }
}

while ($true) {
    Write-Host ''
    Write-Host '=== ADApolis admin ===' -ForegroundColor Magenta
    Write-Host ' 1  Discord setup: preview'
    Write-Host ' 2  Discord setup: apply'
    Write-Host ' 3  Discord feeds: preview'
    Write-Host ' 4  Discord feeds: post now'
    Write-Host ' 5  Run the data pipeline (cron) now'
    Write-Host ' R  Re-enter CRON_SECRET'
    Write-Host ' Q  Quit'
    switch ((Read-Host 'Choose').Trim().ToUpper()) {
        '1' { Invoke-Admin '/api/admin/discord/setup' }
        '2' { Invoke-Admin '/api/admin/discord/setup?apply=1' }
        '3' { Invoke-Admin '/api/admin/discord/feeds' }
        '4' { Invoke-Admin '/api/admin/discord/feeds?apply=1' }
        '5' { Invoke-Admin '/api/cron' }
        'R' { Remove-Item $Store -ErrorAction SilentlyContinue; $null = Get-Secret }
        'Q' { exit 0 }
        default { Write-Host 'Pick 1-5, R or Q.' }
    }
}
