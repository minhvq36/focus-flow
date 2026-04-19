# FocusFlow - Contributing Guide

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Go 1.21 or higher
- Docker & Docker Compose
- Git

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/focusflow.git
   cd focusflow
   ```

2. Install dependencies:
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend (Go manages dependencies with go.mod)
   cd ../backend
   go mod download
   ```

3. Set up environment variables:
   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

4. Start the development environment:
   ```bash
   # Terminal 1: Start infrastructure
   cd infra
   docker-compose up -d
   
   # Terminal 2: Start backend
   cd backend
   go run ./cmd/server
   
   # Terminal 3: Start frontend
   cd frontend
   npm run dev
   ```

## Code Style

### Frontend (TypeScript/React)
- Use functional components with hooks
- Use Zustand for global state
- Use TypeScript for type safety
- Follow ESLint rules

### Backend (Go)
- Use the standard Go conventions
- Follow [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- Use proper error handling
- Write unit tests for business logic

## Commit Messages

Use conventional commits:
- `feat: add new feature`
- `fix: fix a bug`
- `docs: update documentation`
- `style: code style changes`
- `refactor: code refactoring`
- `test: add tests`
- `chore: dependencies or config changes`

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit
3. Push to your fork: `git push origin feature/your-feature`
4. Create a Pull Request with a clear description
5. Wait for CI to pass and code review

## Testing

### Frontend
```bash
cd frontend
npm run test
```

### Backend
```bash
cd backend
go test ./...
```

## Deployment

The project uses GitHub Actions for CI/CD. Merging to `main` triggers deployment.
