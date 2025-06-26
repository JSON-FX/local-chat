# PowerShell script to configure IIS for LGU Chat
# Run as Administrator

param(
    [string]$SiteName = "LGU-Chat",
    [string]$SitePath = "C:\inetpub\wwwroot\lgu-chat",
    [string]$Port = "80",
    [string]$DomainName = "lgu-chat.lguquezon.com.local"
)

Write-Host "Configuring IIS for LGU Chat Application..." -ForegroundColor Green

# Import IIS module
Import-Module WebAdministration

# Stop Default Web Site if it exists and is running
try {
    $defaultSite = Get-IISSite -Name "Default Web Site" -ErrorAction SilentlyContinue
    if ($defaultSite -and $defaultSite.State -eq "Started") {
        Stop-IISSite -Name "Default Web Site" -Confirm:$false
        Write-Host "Stopped Default Web Site" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Default Web Site not found or already stopped" -ForegroundColor Yellow
}

# Remove existing site if it exists
try {
    Remove-IISSite -Name $SiteName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed existing $SiteName site" -ForegroundColor Yellow
} catch {
    Write-Host "No existing $SiteName site found" -ForegroundColor Yellow
}

# Create new IIS site using WebAdministration cmdlets
New-Website -Name $SiteName -PhysicalPath $SitePath -Port $Port
Write-Host "Created IIS site: $SiteName" -ForegroundColor Green

# Set application pool to use No Managed Code
Set-ItemProperty -Path "IIS:\AppPools\$SiteName" -Name "managedRuntimeVersion" -Value ""
Write-Host "Configured application pool for Node.js" -ForegroundColor Green

# Set permissions for IIS_IUSRS on the site directory
$acl = Get-Acl $SitePath
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl -Path $SitePath -AclObject $acl
Write-Host "Set permissions for IIS_IUSRS" -ForegroundColor Green

# Create uploads directory with proper permissions
$uploadsPath = Join-Path $SitePath "uploads"
if (-not (Test-Path $uploadsPath)) {
    New-Item -ItemType Directory -Path $uploadsPath -Force
}
$uploadsAcl = Get-Acl $uploadsPath
$uploadsAcl.SetAccessRule($accessRule)
Set-Acl -Path $uploadsPath -AclObject $uploadsAcl
Write-Host "Created and configured uploads directory" -ForegroundColor Green

# Create data directory with proper permissions
$dataPath = Join-Path $SitePath "data"
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force
}
$dataAcl = Get-Acl $dataPath
$dataAcl.SetAccessRule($accessRule)
Set-Acl -Path $dataPath -AclObject $dataAcl
Write-Host "Created and configured data directory" -ForegroundColor Green

Write-Host "IIS configuration completed!" -ForegroundColor Green
Write-Host "Site: $SiteName" -ForegroundColor Cyan
Write-Host "Path: $SitePath" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Cyan
Write-Host "Domain: $DomainName" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Copy your built application to: $SitePath" -ForegroundColor White
Write-Host "2. Configure DNS for: $DomainName" -ForegroundColor White
Write-Host "3. Start the IIS site" -ForegroundColor White 