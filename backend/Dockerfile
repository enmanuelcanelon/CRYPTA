FROM rust:1.80-slim-bullseye AS builder
WORKDIR /app

# Copy source code
COPY . .

# Build the release binary
RUN cargo build --release

# ---------------------------------------------------
# Final minimal image
FROM debian:bullseye-slim
WORKDIR /app

# Install runtime dependencies (sqlite & ca-certificates)
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/backend /usr/local/bin/rustvault

# The database will be created here
VOLUME ["/app/data"]
ENV DATABASE_URL="sqlite:/app/data/vault.db?mode=rwc"

# Expose the API port
EXPOSE 3000

# Start the Monolith
CMD ["rustvault"]
