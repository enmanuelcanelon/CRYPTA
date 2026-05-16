use axum::{
    extract::State,
    http::Method,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
}

#[derive(Serialize, Deserialize)]
struct VaultData {
    device_id: String,
    content: String, // JSON-stringified encrypted vault (iv + data)
}

#[derive(Serialize)]
struct ApiResponse {
    message: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db_url = "sqlite:vault.db?mode=rwc";
    let pool = SqlitePool::connect(db_url)
        .await
        .expect("Failed to connect to SQLite");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS vaults (
            device_id  TEXT PRIMARY KEY,
            content    TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await
    .expect("Failed to create table");

    let state = AppState { db: pool };

    // CORS: allow the browser extension and localhost dev tools
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/sync", post(sync_vault))
        .route("/vault/{device_id}", get(get_vault))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("RustVault backend listening on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

async fn sync_vault(
    State(state): State<AppState>,
    Json(payload): Json<VaultData>,
) -> Result<Json<ApiResponse>, String> {
    sqlx::query(
        "INSERT INTO vaults (device_id, content, updated_at)
         VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(device_id) DO UPDATE SET
           content    = excluded.content,
           updated_at = CURRENT_TIMESTAMP",
    )
    .bind(&payload.device_id)
    .bind(&payload.content)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Json(ApiResponse {
        message: "Vault synced".to_string(),
    }))
}

async fn get_vault(
    State(state): State<AppState>,
    axum::extract::Path(device_id): axum::extract::Path<String>,
) -> Result<Json<VaultData>, String> {
    let row: (String, String) =
        sqlx::query_as("SELECT device_id, content FROM vaults WHERE device_id = ?")
            .bind(&device_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| e.to_string())?;

    Ok(Json(VaultData {
        device_id: row.0,
        content: row.1,
    }))
}
