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
fn get_db_path() -> PathBuf {
    // 优先使用 Tauri 应用数据目录，如果不可用则使用相对路径
    #[cfg(debug_assertions)]
    {
        // 开发环境下使用相对路径
        PathBuf::from("positions.db")
    }
    #[cfg(not(debug_assertions))]
    {
        // 生产环境下使用应用数据目录
        if let Ok(data_dir) = tauri::api::path::data_dir() {
            data_dir.join("InvestmentTracker").join("positions.db")
        } else {
            PathBuf::from("positions.db")
        }
    }
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

            // 数据库管理命令
            commands::position::reset_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}