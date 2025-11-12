// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 模块声明
mod migration;
mod commands;
mod db;
mod models;
mod error;

use rusqlite::{Connection};
use std::path::PathBuf;

/// 获取数据库路径
/// 使用用户主目录下的固定位置，确保无论从哪里启动应用，数据库位置都一致
fn get_db_path() -> PathBuf {
    // 使用用户主目录 + .investmenttracker 子目录
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    
    let app_data_dir = PathBuf::from(home_dir).join(".investmenttracker");
    
    // 确保目录存在
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("无法创建应用数据目录: {}", e);
    }
    
    app_data_dir.join("positions.db")
}

/// 获取数据库连接
fn get_db() -> Result<Connection, String> {
    init_db().map_err(|e| e.to_string())
}

/// 初始化数据库
fn init_db() -> Result<Connection, String> {
    let db_path = get_db_path();

    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // 执行数据库迁移（从旧版本到新版本）
    migration::migrate_v0_to_v1(&conn).map_err(|e| e.to_string())?;

    // 如果是全新数据库，创建新表结构
    conn.execute(
        "CREATE TABLE IF NOT EXISTS positions (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            buy_price REAL NOT NULL,
            buy_date TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'POSITION',
            portfolio TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 创建索引
    conn.execute("CREATE INDEX IF NOT EXISTS idx_code ON positions(code)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON positions(status)", [])
        .map_err(|e| e.to_string())?;

    Ok(conn)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // 持仓相关命令
            commands::position::save_position,
            commands::position::get_positions,
            commands::position::get_position_records,
            commands::position::get_codes_in_position,
            commands::position::close_position,
            commands::position::delete_position,
            commands::position::get_position_stats,
            commands::position::get_portfolio_summary,
            commands::position::get_all_portfolio_summaries,
            commands::position::get_portfolios,
            commands::position::get_portfolio_positions,
            commands::position::get_portfolio_profit_loss_view,
            commands::position::fetch_stock_name,

            // 数据库管理命令
            commands::position::reset_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}