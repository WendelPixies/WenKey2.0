#!/bin/bash

# Build script for WenKey Docker image
# This script builds the Docker image with proper environment variables

set -e  # Exit on error

echo "🐳 Building WenKey Docker Image"
echo "================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your Supabase credentials"
    echo ""
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Load environment variables from .env
export $(cat .env | grep -v '^#' | xargs)

# Verify required variables are set
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ Error: VITE_SUPABASE_URL is not set in .env"
    exit 1
fi

if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo "❌ Error: VITE_SUPABASE_PUBLISHABLE_KEY is not set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "📍 Supabase URL: $VITE_SUPABASE_URL"
echo ""

# Build Docker image
echo "🔨 Building Docker image..."
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  -t wenkey:latest \
  .

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "To run the container:"
echo "  docker run -d -p 80:80 --name wenkey-app wenkey:latest"
echo ""
echo "To stop the container:"
echo "  docker stop wenkey-app && docker rm wenkey-app"
