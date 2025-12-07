#!/bin/bash

# GraphicEditor API - Quick Start Script

echo "🚀 Starting GraphicEditor API..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "✅ .env file created"
else
  echo "✅ .env file already exists"
fi

# Start database services
echo ""
echo "🐘 Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if migrations have been run
echo ""
echo "🔧 Running database migrations..."
bun run migration:run

# Start the development server
echo ""
echo "🎉 Starting NestJS development server..."
echo ""
echo "📍 API will be available at: http://localhost:3000/api/v1"
echo "📚 API Docs will be available at: http://localhost:3000/api/docs"
echo "🔌 WebSocket will be available at: ws://localhost:3000/collaboration"
echo ""

bun run start:dev
