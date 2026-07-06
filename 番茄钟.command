#!/bin/bash
cd "$(dirname "$0")"

# 启动 electron 应用（后台运行），然后退出终端
npm start &
sleep 2
osascript -e 'tell application "Terminal" to close first window whose name contains "番茄钟"' 2>/dev/null &