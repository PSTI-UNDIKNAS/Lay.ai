include ../../.env
export

# This tells 'make' that these are command names, not files.
.PHONY: migrate-up migrate-down migrate-new

## migrate-up: applies all new 'up' migrations
migrate-up:
	@echo "Running database migrations up..."
	docker run --rm --network host -v "$(CURDIR)/migrations:/migrations" migrate/migrate \
	-path /migrations -database "${DATABASE_URL}" \
	up

## migrate-down: reverts the very last 'up' migration
migrate-down:
	@echo "Reverting last database migration..."
	docker run --rm --network host -v "$(CURDIR)/migrations:/migrations" migrate/migrate \
	-path /migrations -database "${DATABASE_URL}" \
	down 1

## migrate-new: creates a new set of versioned migration files
# Example Usage: make migrate-new name=create_courses_table
migrate-new:
	@echo "Creating new migration files for ${name}..."
	docker run --rm -v "$(CURDIR)/migrations:/migrations" migrate/migrate create -ext sql -dir /migrations -seq ${name}