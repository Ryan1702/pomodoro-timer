#!/bin/bash

# ============================================
# 番茄钟 - 恢复跳过额度
# 双击运行此文件即可恢复今日专注阶段的 3 次跳过额度
# ============================================

APP_NAME="pomodoro-timer"
LOCAL_STORAGE_DIR="$HOME/Library/Application Support/$APP_NAME/Local Storage"

echo "🍅 番茄钟 - 恢复跳过额度"
echo "=========================="
echo ""

# 检查 localStorage 目录是否存在
if [ ! -d "$LOCAL_STORAGE_DIR" ]; then
    echo "⚠️  未找到应用数据目录，可能尚未运行过番茄钟应用。"
    echo "   请先运行一次番茄钟，然后再使用此脚本。"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

# 检查应用是否正在运行（避免数据冲突）
APP_RUNNING=$(pgrep -f "$APP_NAME" 2>/dev/null || true)
if [ -n "$APP_RUNNING" ]; then
    echo "⚠️  检测到番茄钟应用正在运行。"
    echo "   请在运行此脚本前先关闭番茄钟应用，以避免数据冲突。"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

# 确认操作
echo "此操作将清除 localStorage 数据，包括："
echo "  ✅ 跳过额度 → 恢复为今日 3 次"
echo "  ⚠️  自定义时长设置 → 恢复为默认值（专注25分钟/短休息5分钟/长休息15分钟）"
echo ""
read -p "是否继续？(y/n) " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消。"
    read -p "按回车键退出..."
    exit 0
fi

# 删除 localStorage 目录
rm -rf "$LOCAL_STORAGE_DIR"
echo "✅ 跳过额度已恢复！今日拥有 3 次跳过机会。"
echo ""
echo "下次启动番茄钟时生效。"
echo ""

read -p "按回车键退出..."
exit 0