@echo off
chcp 65001 >nul 2>&1
title 班级积分榜
echo.
echo  ╔══════════════════════════════════╗
echo  ║     班级积分榜 - 启动中...       ║
echo  ╚══════════════════════════════════╝
echo.

cd /d "%~dp0"

:: 检查 node 是否可用
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 检查 node_modules
if not exist "node_modules\better-sqlite3" (
    echo [提示] 首次运行，正在安装依赖...
    npm install --production --no-optional 2>nul
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo [完成] 依赖安装成功
    echo.
)

:: 启动服务
echo [启动] 服务运行在 http://localhost:3000
echo [提示] 关闭此窗口即可停止服务
echo.

:: 延迟2秒后打开浏览器
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: 启动 server
node server.cjs
