#!/data/data/com.termux/files/usr/bin/bash

# SponsPay API Services Manager for Termux
# Usage: ./services.sh start|stop|restart|status

set -e

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/.logs"
POSTGRES_DATA="$SCRIPT_DIR/.postgres-data"

# Create necessary directories
mkdir -p "$PID_DIR" "$LOG_DIR" "$POSTGRES_DATA"

# Service configuration
POSTGRES_PORT=5432
REDIS_PORT=6379
API_PORT=3000

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize PostgreSQL data directory if needed
init_postgres() {
    if [ ! -f "$POSTGRES_DATA/PG_VERSION" ]; then
        log_info "Initializing PostgreSQL data directory..."
        initdb -D "$POSTGRES_DATA" -U filip --auth=trust

        # Create postgresql.conf with custom settings
        cat >> "$POSTGRES_DATA/postgresql.conf" << EOF

# Custom settings for Termux
port = $POSTGRES_PORT
unix_socket_directories = '$POSTGRES_DATA'
listen_addresses = 'localhost'
max_connections = 20
shared_buffers = 128MB
EOF
    fi
}

# Start PostgreSQL
start_postgres() {
    if [ -f "$PID_DIR/postgres.pid" ] && kill -0 $(cat "$PID_DIR/postgres.pid") 2>/dev/null; then
        log_warn "PostgreSQL is already running (PID: $(cat "$PID_DIR/postgres.pid"))"
        return
    fi

    init_postgres

    log_info "Starting PostgreSQL..."
    pg_ctl -D "$POSTGRES_DATA" -l "$LOG_DIR/postgres.log" start

    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if pg_isready -h localhost -p $POSTGRES_PORT -U filip >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    # Get PID
    pg_ctl -D "$POSTGRES_DATA" status | grep PID | awk '{print $NF}' > "$PID_DIR/postgres.pid"

    # Create database if it doesn't exist
    if ! psql -h localhost -p $POSTGRES_PORT -U filip -lqt | cut -d \| -f 1 | grep -qw dev; then
        log_info "Creating 'dev' database..."
        createdb -h localhost -p $POSTGRES_PORT -U filip dev
    fi

    log_info "PostgreSQL started (PID: $(cat "$PID_DIR/postgres.pid"))"
}

# Stop PostgreSQL
stop_postgres() {
    if [ -f "$PID_DIR/postgres.pid" ]; then
        log_info "Stopping PostgreSQL..."
        pg_ctl -D "$POSTGRES_DATA" stop -m fast
        rm -f "$PID_DIR/postgres.pid"
        log_info "PostgreSQL stopped"
    else
        log_warn "PostgreSQL is not running"
    fi
}

# Start Redis
start_redis() {
    if [ -f "$PID_DIR/redis.pid" ] && kill -0 $(cat "$PID_DIR/redis.pid") 2>/dev/null; then
        log_warn "Redis is already running (PID: $(cat "$PID_DIR/redis.pid"))"
        return
    fi

    log_info "Starting Redis..."
    redis-server --daemonize yes \
        --port $REDIS_PORT \
        --pidfile "$PID_DIR/redis.pid" \
        --logfile "$LOG_DIR/redis.log" \
        --dir "$SCRIPT_DIR"

    log_info "Redis started (PID: $(cat "$PID_DIR/redis.pid"))"
}

# Stop Redis
stop_redis() {
    if [ -f "$PID_DIR/redis.pid" ]; then
        log_info "Stopping Redis..."
        redis-cli -p $REDIS_PORT shutdown
        rm -f "$PID_DIR/redis.pid"
        log_info "Redis stopped"
    else
        log_warn "Redis is not running"
    fi
}

# Start API
start_api() {
    if [ -f "$PID_DIR/api.pid" ] && kill -0 $(cat "$PID_DIR/api.pid") 2>/dev/null; then
        log_warn "API is already running (PID: $(cat "$PID_DIR/api.pid"))"
        return
    fi

    log_info "Starting API (Node.js dev server)..."

    # Ensure node_modules exist
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        log_info "Installing dependencies first..."
        npm install
    fi

    # Start in background with increased heap size (2GB)
    cd "$SCRIPT_DIR"
    NODE_OPTIONS="--max-old-space-size=2048" nohup npm run start:dev > "$LOG_DIR/api.log" 2>&1 &
    echo $! > "$PID_DIR/api.pid"

    log_info "API started (PID: $(cat "$PID_DIR/api.pid"))"
    log_info "API logs: tail -f $LOG_DIR/api.log"
}

# Stop API
stop_api() {
    if [ -f "$PID_DIR/api.pid" ]; then
        log_info "Stopping API..."
        PID=$(cat "$PID_DIR/api.pid")

        # Kill process tree (npm and node)
        pkill -P $PID 2>/dev/null || true
        kill $PID 2>/dev/null || true

        rm -f "$PID_DIR/api.pid"
        log_info "API stopped"
    else
        log_warn "API is not running"
    fi
}

# Start all services
start_all() {
    log_info "Starting all services..."
    start_postgres
    start_redis
    start_api
    log_info ""
    log_info "All services started successfully!"
    log_info "  - PostgreSQL: localhost:$POSTGRES_PORT"
    log_info "  - Redis: localhost:$REDIS_PORT"
    log_info "  - API: http://localhost:$API_PORT"
    log_info ""
    log_info "Run './services.sh status' to check service status"
}

# Stop all services
stop_all() {
    log_info "Stopping all services..."
    stop_api
    stop_redis
    stop_postgres
    log_info "All services stopped"
}

# Check service status
check_status() {
    echo ""
    echo "Service Status:"
    echo "==============="

    # PostgreSQL
    if [ -f "$PID_DIR/postgres.pid" ] && kill -0 $(cat "$PID_DIR/postgres.pid") 2>/dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL: Running (PID: $(cat "$PID_DIR/postgres.pid"))"
    else
        echo -e "${RED}✗${NC} PostgreSQL: Stopped"
    fi

    # Redis
    if [ -f "$PID_DIR/redis.pid" ] && kill -0 $(cat "$PID_DIR/redis.pid") 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Redis: Running (PID: $(cat "$PID_DIR/redis.pid"))"
    else
        echo -e "${RED}✗${NC} Redis: Stopped"
    fi

    # API
    if [ -f "$PID_DIR/api.pid" ] && kill -0 $(cat "$PID_DIR/api.pid") 2>/dev/null; then
        echo -e "${GREEN}✓${NC} API: Running (PID: $(cat "$PID_DIR/api.pid"))"
    else
        echo -e "${RED}✗${NC} API: Stopped"
    fi

    echo ""
    echo "Logs:"
    echo "  PostgreSQL: $LOG_DIR/postgres.log"
    echo "  Redis: $LOG_DIR/redis.log"
    echo "  API: $LOG_DIR/api.log"
    echo ""
}

# Main command handler
case "${1:-}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_all
        ;;
    status)
        check_status
        ;;
    start-postgres)
        start_postgres
        ;;
    stop-postgres)
        stop_postgres
        ;;
    start-redis)
        start_redis
        ;;
    stop-redis)
        stop_redis
        ;;
    start-api)
        start_api
        ;;
    stop-api)
        stop_api
        ;;
    logs)
        if [ -n "${2:-}" ]; then
            tail -f "$LOG_DIR/${2}.log"
        else
            log_error "Usage: ./services.sh logs [postgres|redis|api]"
            exit 1
        fi
        ;;
    *)
        echo "SponsPay API Services Manager"
        echo ""
        echo "Usage: ./services.sh {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start              Start all services"
        echo "  stop               Stop all services"
        echo "  restart            Restart all services"
        echo "  status             Check service status"
        echo "  logs SERVICE       Tail logs (postgres|redis|api)"
        echo ""
        echo "Individual service commands:"
        echo "  start-postgres     Start PostgreSQL only"
        echo "  stop-postgres      Stop PostgreSQL only"
        echo "  start-redis        Start Redis only"
        echo "  stop-redis         Stop Redis only"
        echo "  start-api          Start API only"
        echo "  stop-api           Stop API only"
        echo ""
        exit 1
        ;;
esac
