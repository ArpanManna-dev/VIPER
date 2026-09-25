.PHONY: install dev backend frontend test clean

install:
	@echo "Installing backend dependencies..."
	pip install -r backend/requirements.txt
	@echo "Installing frontend dependencies..."
	npm install --prefix frontend

dev:
	@echo "Starting VIPER (backend + frontend)..."
	@trap 'kill 0' SIGINT; \
	  uvicorn backend.main:app --reload --port 8000 & \
	  npm run dev --prefix frontend & \
	  wait

backend:
	uvicorn backend.main:app --reload --port 8000

frontend:
	npm run dev --prefix frontend

test:
	pytest backend/ -v

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	find . -name "*.pyc" -delete 2>/dev/null; true
	rm -rf frontend/dist frontend/.vite
