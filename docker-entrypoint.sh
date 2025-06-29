#!/bin/sh
set -e

# Function to check if database exists and is properly initialized
check_database() {
    if [ ! -f "/app/data/localchat.db" ]; then
        echo "🔍 Database not found. Initializing database..."
        return 1
    fi
    
    # Check if database has required tables
    if ! sqlite3 /app/data/localchat.db "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" | grep -q "users"; then
        echo "🔍 Database exists but appears uninitialized. Re-initializing..."
        return 1
    fi
    
    echo "✅ Database is already initialized"
    return 0
}

# Initialize database if needed
if ! check_database; then
    echo "🔄 Initializing LGU-Chat database..."
    npx tsx scripts/init-db.ts
    echo "✅ Database initialization completed!"
fi

# Print startup information
echo ""
echo "🚀 Starting LGU-Chat Server..."
echo "📍 Environment: ${NODE_ENV:-production}"
echo "🌐 Port: ${PORT:-3000}"
echo "📊 Socket.IO enabled"
echo ""

# Start the application
exec npx tsx server.ts 