#!/bin/bash

# Phonoglyph Development Setup Script
# This script sets up the development environment for the Phonoglyph project

set -e

echo "🎵 Setting up Raybox Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL 16+ and try again."
    echo "   You can install it using:"
    echo "   - macOS: brew install postgresql"
    echo "   - Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

echo "✅ PostgreSQL detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install workspace dependencies
echo "📦 Installing workspace dependencies..."
npm ci -w apps/web
npm ci -w apps/api

# Create environment files
echo "⚙️  Setting up environment files..."
if [ ! -f "apps/api/.env" ]; then
    cp apps/api/env.example apps/api/.env
    echo "✅ Created apps/api/.env from example"
    echo "⚠️  Please update the .env file with your database credentials"
else
    echo "✅ Environment file already exists"
fi

# Check if database exists
echo "🔍 Checking database connection..."
if ! npm run db:migrate -w apps/api &> /dev/null; then
    echo "⚠️  Database migration failed. Please ensure:"
    echo "   1. PostgreSQL is running"
    echo "   2. Database 'phonoglyph' exists"
    echo "   3. Database credentials in apps/api/.env are correct"
    echo ""
    echo "   To create the database, run:"
    echo "   createdb phonoglyph"
    exit 1
fi

echo "✅ Database connection successful"

# Run database setup
echo "🗄️  Setting up database..."
npm run db:setup -w apps/api

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "   This will start:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001"
echo ""
echo "Happy coding! 🎵" 