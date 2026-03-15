#!/bin/bash
# Docker PostgreSQL 数据库管理脚本

set -e

COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="db"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 是否运行
check_docker() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装或不在 PATH 中${NC}"
    echo "请安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
  fi

  if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon 未运行${NC}"
    echo "请启动 Docker Desktop"
    exit 1
  fi
}

# 启动数据库
start_db() {
  echo -e "${GREEN}🚀 启动 PostgreSQL 数据库...${NC}"
  docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
  
  echo -e "${YELLOW}⏳ 等待数据库就绪...${NC}"
  sleep 3
  
  # 等待健康检查
  for i in {1..30}; do
    if docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME" | grep -q "healthy"; then
      echo -e "${GREEN}✅ 数据库已就绪！${NC}"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  
  echo -e "\n${YELLOW}⚠️  数据库可能还在启动中，请稍候...${NC}"
}

# 停止数据库
stop_db() {
  echo -e "${YELLOW}🛑 停止 PostgreSQL 数据库...${NC}"
  docker-compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME"
  echo -e "${GREEN}✅ 数据库已停止${NC}"
}

# 重启数据库
restart_db() {
  echo -e "${YELLOW}🔄 重启 PostgreSQL 数据库...${NC}"
  docker-compose -f "$COMPOSE_FILE" restart "$SERVICE_NAME"
  echo -e "${GREEN}✅ 数据库已重启${NC}"
}

# 查看状态
status_db() {
  echo -e "${GREEN}📊 数据库状态：${NC}"
  docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME"
  
  echo -e "\n${GREEN}📝 连接信息：${NC}"
  echo "  主机: localhost"
  echo "  端口: 5432"
  echo "  数据库: ai_recruitment_app"
  echo "  用户名: postgres"
  echo "  密码: 12345678"
  echo ""
  echo "  DATABASE_URL: postgresql://postgres:12345678@localhost:5432/ai_recruitment_app"
}

# 查看日志
logs_db() {
  docker-compose -f "$COMPOSE_FILE" logs -f "$SERVICE_NAME"
}

# 删除数据库（包括数据）
remove_db() {
  echo -e "${RED}⚠️  警告：这将删除数据库容器和所有数据！${NC}"
  read -p "确认删除？[y/N]: " -r REPLY
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f "$COMPOSE_FILE" down -v
    echo -e "${GREEN}✅ 数据库已删除${NC}"
  else
    echo "取消操作"
  fi
}

# 连接到数据库
connect_db() {
  if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql 未安装，使用 Docker 执行...${NC}"
    docker-compose -f "$COMPOSE_FILE" exec "$SERVICE_NAME" psql -U postgres -d ai_recruitment_app
  else
    PGPASSWORD=12345678 psql -h localhost -p 5432 -U postgres -d ai_recruitment_app
  fi
}

# 主菜单
show_help() {
  echo "Docker PostgreSQL 数据库管理脚本"
  echo ""
  echo "用法: $0 [命令]"
  echo ""
  echo "命令:"
  echo "  start     启动数据库"
  echo "  stop      停止数据库"
  echo "  restart   重启数据库"
  echo "  status    查看状态"
  echo "  logs      查看日志"
  echo "  connect   连接到数据库"
  echo "  remove    删除数据库（包括数据）"
  echo "  help      显示帮助信息"
  echo ""
}

# 主逻辑
check_docker

case "${1:-help}" in
  start)
    start_db
    ;;
  stop)
    stop_db
    ;;
  restart)
    restart_db
    ;;
  status)
    status_db
    ;;
  logs)
    logs_db
    ;;
  connect)
    connect_db
    ;;
  remove)
    remove_db
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo -e "${RED}❌ 未知命令: $1${NC}"
    show_help
    exit 1
    ;;
esac

