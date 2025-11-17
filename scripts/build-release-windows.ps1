# InvestmentTracker Windows 发布构建脚本
# 用途：清理、构建、打包 Windows 应用
# 使用方法：
#   PowerShell: .\scripts\build-release-windows.ps1
#   CMD: .\scripts\build-release-windows.bat

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Info {
    Write-Host "ℹ " -NoNewline -ForegroundColor Blue
    Write-Host $args
}

function Write-Success {
    Write-Host "✓ " -NoNewline -ForegroundColor Green
    Write-Host $args
}

function Write-Error {
    Write-Host "✗ " -NoNewline -ForegroundColor Red
    Write-Host $args
}

function Write-Warning {
    Write-Host "⚠ " -NoNewline -ForegroundColor Yellow
    Write-Host $args
}

# 获取项目根目录
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $PROJECT_ROOT

Write-Info "项目根目录: $PROJECT_ROOT"
Write-Host ""

# 步骤 1: 清理
Write-Info "步骤 1/4: 清理构建缓存..."
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
if (Test-Path "src-tauri\target\release\bundle\nsis") {
    Remove-Item -Recurse -Force "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue
}
Write-Success "清理完成"
Write-Host ""

# 步骤 2: 构建 Next.js
Write-Info "步骤 2/4: 构建 Next.js 前端..."
try {
    npm run next:build
    if ($LASTEXITCODE -ne 0) {
        throw "Next.js 构建失败"
    }
    Write-Success "Next.js 构建完成"
} catch {
    Write-Error "Next.js 构建失败: $_"
    exit 1
}
Write-Host ""

# 步骤 3: 构建 Tauri 应用
Write-Info "步骤 3/5: 构建 Tauri 桌面应用..."
Write-Warning "注意: NSIS 打包可能因网络问题失败，但 exe 文件仍会生成"
try {
    npm run tauri:build 2>&1 | Out-String
    # 即使构建失败，也继续检查是否有 exe 文件生成
} catch {
    Write-Warning "Tauri 构建过程中出现错误，但继续检查构建产物..."
}
Write-Host ""

# 步骤 4: 查找构建产物
Write-Info "步骤 4/5: 查找构建产物..."

$nsisPath = "src-tauri\target\release\bundle\nsis"
$exePath = "src-tauri\target\release"
$appExe = Join-Path $exePath "app.exe"

# 查找 NSIS 安装程序
$installer = Get-ChildItem -Path $nsisPath -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

# 查找便携版 exe (app.exe 或 InvestmentTracker.exe)
$portable = $null
if (Test-Path $appExe) {
    $portable = Get-Item $appExe
} else {
    $portable = Get-ChildItem -Path $exePath -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*InvestmentTracker*" -or $_.Name -eq "app.exe" } | Select-Object -First 1
}

if ($installer) {
    $fileSize = [math]::Round($installer.Length / 1MB, 2)
    Write-Success "找到安装程序: $($installer.Name)"
    Write-Info "文件大小: ${fileSize} MB"
    Write-Info "文件位置: $($installer.FullName)"
    Write-Host ""
}

if ($portable) {
    $fileSize = [math]::Round($portable.Length / 1MB, 2)
    Write-Success "找到可执行文件: $($portable.Name)"
    Write-Info "文件大小: ${fileSize} MB"
    Write-Info "文件位置: $($portable.FullName)"
    Write-Host ""
}

if (-not $installer -and -not $portable) {
    Write-Error "未找到构建产物"
    Write-Info "请检查构建日志"
    exit 1
}

# 步骤 5: 打包成 zip
Write-Info "步骤 5/5: 打包应用..."

# 获取版本号
$version = (Get-Content "package.json" | ConvertFrom-Json).version
$bundleDir = "src-tauri\target\release\bundle"

# 确保 bundle 目录存在
if (-not (Test-Path $bundleDir)) {
    New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null
}

# 打包便携版 exe
if ($portable) {
    $zipName = "InvestmentTracker_v${version}_Windows.zip"
    $zipPath = Join-Path $bundleDir $zipName
    
    Write-Info "正在创建压缩包: $zipName"
    
    # 删除旧的压缩包
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    # 创建压缩包
    try {
        Compress-Archive -Path $portable.FullName -DestinationPath $zipPath -Force
        $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
        Write-Success "打包完成: $zipName"
        Write-Info "文件大小: ${zipSize} MB"
        Write-Info "文件位置: $zipPath"
        Write-Host ""
    } catch {
        Write-Error "打包失败: $_"
        exit 1
    }
}

# 打包安装程序（如果存在）
if ($installer) {
    $installerZipName = "InvestmentTracker_v${version}_Windows_Installer.zip"
    $installerZipPath = Join-Path $bundleDir $installerZipName
    
    Write-Info "正在创建安装程序压缩包: $installerZipName"
    
    # 删除旧的压缩包
    if (Test-Path $installerZipPath) {
        Remove-Item $installerZipPath -Force
    }
    
    # 创建压缩包
    try {
        Compress-Archive -Path $installer.FullName -DestinationPath $installerZipPath -Force
        $installerZipSize = [math]::Round((Get-Item $installerZipPath).Length / 1MB, 2)
        Write-Success "打包完成: $installerZipName"
        Write-Info "文件大小: ${installerZipSize} MB"
        Write-Info "文件位置: $installerZipPath"
        Write-Host ""
    } catch {
        Write-Warning "安装程序打包失败: $_"
    }
}

Write-Success "🎉 构建完成！"
Write-Host ""
Write-Info "构建产物位置:"
if ($portable) {
    Write-Host "  - 便携版 ZIP: $zipPath"
}
if ($installer) {
    Write-Host "  - 安装程序 ZIP: $installerZipPath"
}
Write-Host ""

