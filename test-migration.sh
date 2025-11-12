#!/bin/bash

# 测试数据库迁移脚本

DB_PATH="$HOME/.investmenttracker/positions.db"

echo "================================"
echo "数据库迁移测试"
echo "================================"
echo ""

# 1. 检查当前表结构
echo "【当前表结构】"
sqlite3 "$DB_PATH" "PRAGMA table_info(positions);" | awk -F'|' '{print $2 " (" $3 ")"}'
echo ""

# 2. 检查是否有新字段
HAS_SELL_PRICE=$(sqlite3 "$DB_PATH" "PRAGMA table_info(positions);" | grep -c "sell_price")
HAS_SELL_DATE=$(sqlite3 "$DB_PATH" "PRAGMA table_info(positions);" | grep -c "sell_date")

if [ "$HAS_SELL_PRICE" -gt 0 ] && [ "$HAS_SELL_DATE" -gt 0 ]; then
    echo "✅ 迁移已完成：sell_price 和 sell_date 字段存在"
else
    echo "❌ 迁移未完成：缺少字段"
    echo "   - sell_price: $([ "$HAS_SELL_PRICE" -gt 0 ] && echo '存在' || echo '缺失')"
    echo "   - sell_date: $([ "$HAS_SELL_DATE" -gt 0 ] && echo '存在' || echo '缺失')"
fi
echo ""

# 3. 查看数据库文件修改时间
echo "【数据库文件信息】"
echo "路径: $DB_PATH"
ls -lh "$DB_PATH" | awk '{print "大小: " $5 ", 修改时间: " $6 " " $7 " " $8}'
echo ""

echo "================================"
echo "如果迁移未完成，请："
echo "1. 停止当前应用 (Ctrl+C 或关闭窗口)"
echo "2. 重新运行: npm run dev"
echo "3. 观察终端输出，查找 [迁移] 相关日志"
echo "================================"

