// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app_lib::Position;
use rusqlite::{Connection, Result as SqliteResult};

fn init_db() -> SqliteResult<Connection> {
    let conn = Connection::open("positions.db")?;
    
    // 先备份现有数据
    let mut backup_positions: Vec<Position> = Vec::new();
    if let Ok(mut stmt) = conn.prepare("SELECT * FROM positions") {
        let rows = stmt.query_map([], |row| {
            Ok(Position {
                code: row.get(0)?,
                name: row.get(1)?,
                quantity: row.get::<_, f64>(2)? as i32, // 从 REAL 转换为 INTEGER
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
        });
        
        if let Ok(positions) = rows {
            backup_positions = positions.filter_map(Result::ok).collect();
        }
    }
    
    // 删除并重建表
    conn.execute("DROP TABLE IF EXISTS positions", [])?;
    
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
    
    // 恢复备份的数据
    for position in backup_positions {
        conn.execute(
            "INSERT INTO positions (
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
        )?;
    }
    
    Ok(conn)
}

#[tauri::command]
async fn save_position(position: Position) -> Result<Position, String> {
    let conn = init_db().map_err(|e| e.to_string())?;
    
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
    // 使用 init_db 来确保表存在
    let conn = init_db()
        .map_err(|e| e.to_string())?;
    
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
    let conn = Connection::open("positions.db")
        .map_err(|e| e.to_string())?;
    
    conn.execute("DROP TABLE IF EXISTS positions", [])
        .map_err(|e| e.to_string())?;
    
    init_db().map_err(|e| e.to_string())?;
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_positions,
            save_position,
            reset_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
