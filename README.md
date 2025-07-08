# Phonoglyph - MIDI Visualization Platform

Transform your MIDI files into stunning visual experiences with our full-stack web application.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 16.1+
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Phonoglyph
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy example environment files
   cp apps/api/env.example apps/api/.env
   
   # Update the .env file with your database credentials
   ```

4. **Set up the database:**
   ```bash
   # Make sure PostgreSQL is running
   # Create database: phonoglyph
   
   # Run migrations and seed data
   npm run db:setup -w apps/api
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🏗️ Architecture

### Monorepo Structure

```
Phonoglyph/
├── apps/
│   ├── web/          # Next.js Frontend (TypeScript)
│   ├── api/          # Express.js Backend (TypeScript)
└── packages/
    └── config/       # Shared configurations
```

### Tech Stack

- **Frontend:** Next.js 14.1.0, TypeScript 5.3.3, Tailwind CSS, tRPC
- **Backend:** Express.js 4.18.2, TypeScript 5.3.3, tRPC, PostgreSQL
- **Database:** PostgreSQL 16.1
- **Testing:** Vitest
- **CI/CD:** GitHub Actions

## 📋 Available Scripts

### Root Commands
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications
- `npm run test` - Run tests for all workspaces
- `npm run lint` - Lint all workspaces

### Frontend (apps/web)
- `npm run dev -w apps/web` - Start frontend development server
- `npm run build -w apps/web` - Build frontend for production
- `npm run test -w apps/web` - Run frontend tests

### Backend (apps/api)
- `npm run dev -w apps/api` - Start backend development server
- `npm run build -w apps/api` - Build backend for production
- `npm run test -w apps/api` - Run backend tests
- `npm run db:migrate -w apps/api` - Run database migrations
- `npm run db:seed -w apps/api` - Seed database with development data
- `npm run db:setup -w apps/api` - Run migrations and seed data

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Specific Tests
```bash
# Frontend tests only
npm run test -w apps/web

# Backend tests only
npm run test -w apps/api

# With coverage
npm run test:coverage -w apps/web
```

## 🔧 Development

### Adding New Features

1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement changes
3. Add tests
4. Commit changes: `git commit -m "feat: add your feature"`
5. Push and create PR

### Database Changes

1. Create migration file in `apps/api/src/db/migrations/`
2. Run migration: `npm run db:migrate -w apps/api`
3. Update seed data if needed

### Environment Variables

#### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/phonoglyph
DB_HOST=localhost
DB_PORT=5432
DB_NAME=phonoglyph
DB_USER=username
DB_PASSWORD=password
```

## 🚢 Deployment

### Staging
Push to `develop` branch to trigger staging deployment via GitHub Actions.

### Production
Push to `main` branch to trigger production deployment via GitHub Actions.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues, please check the troubleshooting section or create an issue in the repository.

---

Made with ❤️ by the Phonoglyph Team 🎵 