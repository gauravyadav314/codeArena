.PHONY: install dev seed build clean

# Install all dependencies
install:
	cd backend && npm install
	cd frontend && npm install

# Run both backend and frontend in dev mode (requires two terminals or use tmux/screen)
dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

# Seed the database with sample data
seed:
	cd backend && npx prisma db push && npx prisma db seed

# Build for production
build:
	cd backend && npm run build
	cd frontend && npm run build

# Clean generated artifacts
clean:
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/dist frontend/node_modules

# Run Docker Compose stack
docker-up:
	docker compose up --build

docker-down:
	docker compose down

