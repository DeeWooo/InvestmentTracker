@echo off
REM InvestmentTracker Windows 发布构建脚本 (CMD 版本)
REM 用途：清理、构建、打包 Windows 应用

setlocal enabledelayedexpansion

REM 获取脚本所在目录的父目录（项目根目录）
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
cd /d "%PROJECT_ROOT%"

echo.
echo [INFO] 项目根目录: %PROJECT_ROOT%
echo.

REM 步骤 1: 清理
echo [INFO] 步骤 1/4: 清理构建缓存...
if exist ".next" rmdir /s /q ".next"
if exist "out" rmdir /s /q "out"
if exist "src-tauri\target\release\bundle\nsis\*.exe" del /q "src-tauri\target\release\bundle\nsis\*.exe"
echo [SUCCESS] 清理完成
echo.

REM 步骤 2: 构建 Next.js
echo [INFO] 步骤 2/4: 构建 Next.js 前端...
call npm run next:build
if errorlevel 1 (
    echo [ERROR] Next.js 构建失败
    exit /b 1
)
echo [SUCCESS] Next.js 构建完成
echo.

REM 步骤 3: 构建 Tauri 应用
echo [INFO] 步骤 3/5: 构建 Tauri 桌面应用...
echo [WARNING] 注意: NSIS 打包可能因网络问题失败，但 exe 文件仍会生成
call npm run tauri:build
REM 即使构建失败，也继续检查是否有 exe 文件生成
echo.

REM 步骤 4: 查找构建产物
echo [INFO] 步骤 4/5: 查找构建产物...
echo.

set "FOUND=0"
set "EXE_FILE="
set "INSTALLER_FILE="

REM 查找便携版 exe (优先查找 app.exe)
if exist "src-tauri\target\release\app.exe" (
    set "EXE_FILE=src-tauri\target\release\app.exe"
    echo [SUCCESS] 找到可执行文件: app.exe
    echo    位置: %PROJECT_ROOT%\src-tauri\target\release\app.exe
    set "FOUND=1"
    echo.
) else if exist "src-tauri\target\release\InvestmentTracker.exe" (
    set "EXE_FILE=src-tauri\target\release\InvestmentTracker.exe"
    echo [SUCCESS] 找到可执行文件: InvestmentTracker.exe
    echo    位置: %PROJECT_ROOT%\src-tauri\target\release\InvestmentTracker.exe
    set "FOUND=1"
    echo.
)

REM 查找 NSIS 安装程序
if exist "src-tauri\target\release\bundle\nsis\*.exe" (
    for %%f in ("src-tauri\target\release\bundle\nsis\*.exe") do (
        set "INSTALLER_FILE=%%~ff"
        echo [SUCCESS] 找到安装程序: %%~nxf
        echo    位置: %%~ff
        set "FOUND=1"
    )
    echo.
)

if !FOUND!==0 (
    echo [ERROR] 未找到构建产物
    echo [INFO] 请检查构建日志
    exit /b 1
)

REM 步骤 5: 打包成 zip
echo [INFO] 步骤 5/5: 打包应用...
echo.

REM 获取版本号（使用 PowerShell 更可靠）
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "$json = Get-Content package.json -Raw | ConvertFrom-Json; Write-Output $json.version"`) do set "VERSION=%%v"

REM 验证版本号是否获取成功
if not defined VERSION (
    echo [WARNING] 无法从 package.json 获取版本号，使用默认版本 0.1.2
    set "VERSION=0.1.2"
)

echo [INFO] 版本号: %VERSION%
echo.

REM 确保 bundle 目录存在
if not exist "src-tauri\target\release\bundle" mkdir "src-tauri\target\release\bundle"

REM 打包便携版 exe
if defined EXE_FILE (
    set "ZIP_NAME=InvestmentTracker_v%VERSION%_Windows.zip"
    set "ZIP_PATH=!PROJECT_ROOT!\src-tauri\target\release\bundle\!ZIP_NAME!"
    
    echo [INFO] 正在创建压缩包: !ZIP_NAME!
    echo [INFO] 源文件: !EXE_FILE!
    echo [INFO] 目标文件: !ZIP_PATH!
    
    REM 删除旧的压缩包
    if exist "!ZIP_PATH!" del /q "!ZIP_PATH!"
    
    REM 使用 PowerShell 创建压缩包（Windows 内置）
    REM 通过环境变量传递路径，避免引号问题
    set "PS_SRC=!EXE_FILE!"
    set "PS_DST=!ZIP_PATH!"
    powershell -NoProfile -Command "$src=$env:PS_SRC; $dst=$env:PS_DST; Compress-Archive -LiteralPath $src -DestinationPath $dst -Force"
    
    if exist "!ZIP_PATH!" (
        echo [SUCCESS] 打包完成: !ZIP_NAME!
        echo    位置: !ZIP_PATH!
        echo.
    ) else (
        echo [ERROR] 打包失败，请检查路径和权限
        echo [DEBUG] EXE_FILE: !EXE_FILE!
        echo [DEBUG] ZIP_PATH: !ZIP_PATH!
        exit /b 1
    )
)

REM 打包安装程序（如果存在）
if defined INSTALLER_FILE (
    set "INSTALLER_ZIP_NAME=InvestmentTracker_v%VERSION%_Windows_Installer.zip"
    set "INSTALLER_ZIP_PATH=!PROJECT_ROOT!\src-tauri\target\release\bundle\!INSTALLER_ZIP_NAME!"
    
    echo [INFO] 正在创建安装程序压缩包: !INSTALLER_ZIP_NAME!
    echo [INFO] 源文件: !INSTALLER_FILE!
    echo [INFO] 目标文件: !INSTALLER_ZIP_PATH!
    
    REM 删除旧的压缩包
    if exist "!INSTALLER_ZIP_PATH!" del /q "!INSTALLER_ZIP_PATH!"
    
    REM 使用 PowerShell 创建压缩包
    REM 通过环境变量传递路径，避免引号问题
    set "PS_SRC=!INSTALLER_FILE!"
    set "PS_DST=!INSTALLER_ZIP_PATH!"
    powershell -NoProfile -Command "$src=$env:PS_SRC; $dst=$env:PS_DST; Compress-Archive -LiteralPath $src -DestinationPath $dst -Force"
    
    if exist "!INSTALLER_ZIP_PATH!" (
        echo [SUCCESS] 打包完成: !INSTALLER_ZIP_NAME!
        echo    位置: !INSTALLER_ZIP_PATH!
        echo.
    ) else (
        echo [WARNING] 安装程序打包失败，但继续执行
    )
)

echo [SUCCESS] 🎉 构建完成！
echo.
echo 构建产物位置:
if defined EXE_FILE (
    set "FINAL_ZIP_PATH=!PROJECT_ROOT!\src-tauri\target\release\bundle\InvestmentTracker_v%VERSION%_Windows.zip"
    echo   - 便携版 ZIP: !FINAL_ZIP_PATH!
)
if defined INSTALLER_FILE (
    set "FINAL_INSTALLER_ZIP_PATH=!PROJECT_ROOT!\src-tauri\target\release\bundle\InvestmentTracker_v%VERSION%_Windows_Installer.zip"
    echo   - 安装程序 ZIP: !FINAL_INSTALLER_ZIP_PATH!
)
echo.

endlocal

