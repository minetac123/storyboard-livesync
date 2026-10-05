param()

$root = $PSScriptRoot + "\.."
Set-Location $root

Write-Host "1. Building static export with DEPLOY_TARGET=gh-pages..."
$env:DEPLOY_TARGET = "gh-pages"
npm run build

if (!(Test-Path "out\index.html")) {
    Write-Error "Build failed: out\index.html not found!"
    exit 1
}

New-Item -ItemType File -Force -Path "out\.nojekyll" | Out-Null

$temp = Join-Path $env:TEMP ([Guid]::NewGuid().ToString())
Write-Host "2. Cloning gh-pages to temporary directory: $temp"
git clone --branch gh-pages --single-branch https://github.com/minetac123/storyboard-livesync.git $temp

Write-Host "3. Copying out/ to gh-pages clone..."
Get-ChildItem -Path "$temp\*" -Exclude ".git" | Remove-Item -Recurse -Force
Copy-Item -Path "out\*" -Destination $temp -Recurse -Force
Copy-Item -Path "out\.nojekyll" -Destination $temp -Force

Set-Location $temp
Write-Host "4. Committing and pushing to origin/gh-pages..."
git add -A
git commit -m "Update GitHub Pages with latest chunking, monochrome UI, and auto-reconnect"
git push origin gh-pages

Set-Location $root
Remove-Item -Path $temp -Recurse -Force
Write-Host "Deployment complete! App is live at: https://minetac123.github.io/storyboard-livesync/"
