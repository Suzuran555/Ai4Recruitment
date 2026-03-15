#!/bin/bash
# 数据库备份脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# 检查 DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ 错误: DATABASE_URL 环境变量未设置${NC}"
    exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}📦 开始备份数据库...${NC}"

# 执行备份
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ 备份成功: $BACKUP_FILE${NC}"
    
    # 压缩备份
    if command -v gzip &> /dev/null; then
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo -e "${GREEN}✅ 备份已压缩: $BACKUP_FILE${NC}"
    fi
    
    # 获取备份文件大小
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}📊 备份大小: $SIZE${NC}"
    fi
else
    echo -e "${RED}❌ 备份失败${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# 删除旧备份
echo -e "${YELLOW}🧹 清理 $RETENTION_DAYS 天前的备份...${NC}"
find "$BACKUP_DIR" -name "backup_*.sql*" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✅ 清理完成${NC}"

# 显示备份列表
echo -e "\n${GREEN}📋 当前备份文件:${NC}"
ls -lh "$BACKUP_DIR"/backup_*.sql* 2>/dev/null || echo "  无备份文件"

echo -e "\n${GREEN}✅ 备份流程完成${NC}"

