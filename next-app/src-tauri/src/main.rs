// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app_lib::Position;
use rusqlite::{Connection, Result as SqliteResult};
use std::sync::{Arc, Mutex};
use std::sync::OnceLock;

// 全局数据库连接
static DB_CONNECTION: OnceLock<Arc<Mutex<Option<Connection>>>> = OnceLock::new();

fn get_db() -> SqliteResult<Arc<Mutex<Option<Connection>>>> {
    let conn = DB_CONNECTION.get_or_init(|| Arc::new(Mutex::new(None)));
    let mut conn_guard = conn.lock().unwrap();
    if conn_guard.is_none() {
        *conn_guard = Some(init_db()?);
    }
    Ok(conn.clone())
}

fn init_db() -> SqliteResult<Connection> {
    let conn = Connection::open("positions.db")?;
    
    // 只保留 positions 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS positions (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            buy_price REAL NOT NULL,
            buy_date TEXT NOT NULL,
            portfolio TEXT,
            symbol TEXT,
            current_price REAL,
            pnl REAL,
            pnl_percentage REAL,
            profit10 REAL,
            profit20 REAL
        )",
        [],
    )?;
    
    Ok(conn)
}

#[tauri::command]
async fn save_position(position: Position) -> Result<Position, String> {
    let conn = get_db().map_err(|e| e.to_string())?;
    let conn_guard = conn.lock().unwrap();
    let conn = conn_guard.as_ref().unwrap();
    
    conn.execute(
        "INSERT OR REPLACE INTO positions (
            code, name, quantity, buy_price, buy_date, portfolio, 
            symbol, current_price, pnl, pnl_percentage, profit10, profit20
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            &position.code,
            &position.name,
            position.quantity,
            position.buy_price,
            &position.buy_date,
            &position.portfolio,
            &position.symbol,
            position.current_price,
            position.pnl,
            position.pnl_percentage,
            position.profit10,
            position.profit20,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(position)
}

#[tauri::command]
async fn get_positions() -> Result<Vec<Position>, String> {
    let conn = get_db().map_err(|e| e.to_string())?;
    let conn_guard = conn.lock().unwrap();
    let conn = conn_guard.as_ref().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT * FROM positions")
        .map_err(|e| e.to_string())?;
    
    let positions = stmt
        .query_map([], |row| {
            Ok(Position {
                code: row.get(0)?,
                name: row.get(1)?,
                quantity: row.get(2)?,
                buy_price: row.get(3)?,
                buy_date: row.get(4)?,
                portfolio: row.get(5)?,
                symbol: row.get(6)?,
                current_price: row.get(7)?,
                pnl: row.get(8)?,
                pnl_percentage: row.get(9)?,
                profit10: row.get(10)?,
                profit20: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<Position>>>()
        .map_err(|e| e.to_string())?;

    Ok(positions)
}

#[tauri::command]
async fn reset_database() -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    {
        let conn_guard = db.lock().unwrap();
        let conn = conn_guard.as_ref().unwrap();
        
        conn.execute("DROP TABLE IF EXISTS positions", [])
            .map_err(|e| e.to_string())?;
    }
    
    // 重新初始化数据库
    *db.lock().unwrap() = None;
    get_db().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn get_portfolio_summary() -> Result<Vec<PortfolioSummary>, String> {
    let conn = get_db().map_err(|e| e.to_string())?;
    let conn_guard = conn.lock().unwrap();
    let conn = conn_guard.as_ref().unwrap();
    
    // 获取组合汇总数据
    let mut stmt = conn
        .prepare("SELECT portfolio, SUM(quantity * buy_price) as total_cost, SUM(quantity * current_price) as total_value FROM positions GROUP BY portfolio")
        .map_err(|e| e.to_string())?;
    
    let summaries = stmt
        .query_map([], |row| {
            Ok(PortfolioSummary {
                portfolio: row.get(0)?,
                total_cost: row.get(1)?,
                total_value: row.get(2)?,
                pnl: row.get::<_, f64>(2)? - row.get::<_, f64>(1)?,
                pnl_percentage: (row.get::<_, f64>(2)? - row.get::<_, f64>(1)?) / row.get::<_, f64>(1)? * 100.0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<PortfolioSummary>>>()
        .map_err(|e| e.to_string())?;

    Ok(summaries)
}

#[derive(serde::Serialize)]
struct PortfolioSummary {
    portfolio: String,
    total_cost: f64,
    total_value: f64,
    pnl: f64,
    pnl_percentage: f64,
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_positions,
            save_position,
            reset_database,
            get_portfolio_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
