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
/// 使用平台特定的应用数据目录，确保符合各平台的标准规范
fn get_db_path() -> PathBuf {
    let app_data_dir = if cfg!(windows) {
        // Windows: 使用 %APPDATA%\InvestmentTracker
        // 如果 APPDATA 不存在，回退到 USERPROFILE\AppData\Roaming\InvestmentTracker
        let appdata = std::env::var("APPDATA")
            .or_else(|_| {
                std::env::var("USERPROFILE")
                    .map(|home| format!("{}\\AppData\\Roaming", home))
            })
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("InvestmentTracker")
    } else if cfg!(target_os = "macos") {
        // macOS: 使用 ~/Library/Application Support/InvestmentTracker
        // 优先使用 HOME，如果不存在则回退到 USERPROFILE（某些特殊环境可能只有 USERPROFILE）
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("InvestmentTracker")
    } else {
        // Linux 和其他 Unix 系统: 使用 ~/.local/share/InvestmentTracker
        let home = std::env::var("HOME")
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("InvestmentTracker")
    };

    // 确保目录存在
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("❌ 无法创建应用数据目录: {:?}, 错误: {}", app_data_dir, e);
        // 注意：这里不返回错误，让后续步骤尝试处理
    } else {
        println!("✅ 应用数据目录已准备: {:?}", app_data_dir);
    }

    app_data_dir.join("positions.db")
}

/// 获取数据库连接
fn get_db() -> Result<Connection, String> {
    init_db().map_err(|e| e.to_string())
}

/// 初始化数据库
fn init_db() -> Result<Connection, String> {
    println!("[Init DB] 开始初始化数据库...");
    let db_path = get_db_path();
    println!("[Init DB] 数据库路径: {:?}", db_path);

    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        println!("[Init DB] 检查并创建数据库目录: {:?}", parent);
        match std::fs::create_dir_all(parent) {
            Ok(_) => {
                println!("[Init DB] ✅ 数据库目录创建成功");
            }
            Err(e) => {
                let err_msg = format!("创建数据库目录失败: {:?}, 错误: {}", parent, e);
                eprintln!("[Init DB] ❌ {}", err_msg);
                return Err(err_msg);
            }
        }
    } else {
        eprintln!("[Init DB] ⚠️  无法获取数据库路径的父目录");
    }

    // 连接到数据库
    println!("[Init DB] 正在连接数据库...");
    let conn = match Connection::open(&db_path) {
        Ok(conn) => {
            println!("[Init DB] ✅ 数据库连接成功");
            conn
        }
        Err(e) => {
            let err_msg = format!("连接数据库失败: {:?}, 错误: {}", db_path, e);
            eprintln!("[Init DB] ❌ {}", err_msg);
            return Err(err_msg);
        }
    };

    // 检查表是否存在
    println!("[Init DB] 检查表是否存在...");
    let table_exists: bool = match conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='positions'",
        [],
        |row| row.get::<_, i32>(0)
    ) {
        Ok(count) => count > 0,
        Err(e) => {
            eprintln!("[Init DB] ⚠️  检查表是否存在时出错: {}", e);
            false
        }
    };

    if !table_exists {
        // 如果是全新数据库，先创建新表结构（包含所有最新字段）
        println!("[Init DB] 表不存在，创建新表结构...");
        match conn.execute(
            "CREATE TABLE positions (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                buy_price REAL NOT NULL,
                buy_date TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'POSITION',
                portfolio TEXT,
                sell_price REAL,
                sell_date TEXT,
                parent_id TEXT
            )",
            [],
        ) {
            Ok(_) => {
                println!("[Init DB] ✅ 表结构创建成功");
            }
            Err(e) => {
                let err_msg = format!("创建表失败: {}", e);
                eprintln!("[Init DB] ❌ {}", err_msg);
                return Err(err_msg);
            }
        }
    } else {
        println!("[Init DB] 表已存在，跳过表创建");
    }

    // 执行所有数据库迁移（自动处理版本升级）
    // 注意：对于全新数据库，迁移会被跳过；对于已有数据库，迁移会添加缺失的字段
    println!("[Init DB] 开始执行数据库迁移...");
    match migration::run_migrations(&conn) {
        Ok(_) => {
            println!("[Init DB] ✅ 数据库迁移完成");
        }
        Err(e) => {
            let err_msg = format!("数据库迁移失败: {}", e);
            eprintln!("[Init DB] ❌ {}", err_msg);
            return Err(err_msg);
        }
    }

    // 创建索引
    println!("[Init DB] 创建索引...");
    let indexes = vec![
        ("idx_code", "CREATE INDEX IF NOT EXISTS idx_code ON positions(code)"),
        ("idx_status", "CREATE INDEX IF NOT EXISTS idx_status ON positions(status)"),
        ("idx_parent_id", "CREATE INDEX IF NOT EXISTS idx_parent_id ON positions(parent_id)"),
    ];

    for (name, sql) in indexes {
        match conn.execute(sql, []) {
            Ok(_) => {
                println!("[Init DB] ✅ 索引 {} 创建成功", name);
            }
            Err(e) => {
                let err_msg = format!("创建索引 {} 失败: {}", name, e);
                eprintln!("[Init DB] ❌ {}", err_msg);
                return Err(err_msg);
            }
        }
    }

    println!("[Init DB] ✅ 数据库初始化完成");
    Ok(conn)
}

fn main() {
    // 在应用启动时立即初始化数据库
    println!("🚀 应用启动，开始初始化数据库...");
    match init_db() {
        Ok(_) => {
            println!("✅ 数据库初始化成功");
        }
        Err(e) => {
            eprintln!("❌ 数据库初始化失败: {}", e);
            eprintln!("应用将继续运行，但数据库操作可能会失败");
        }
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // 持仓相关命令
            commands::position::save_position,
            commands::position::get_positions,
            commands::position::get_position_records,
            commands::position::get_codes_in_position,
            commands::position::close_position,
            commands::position::reduce_position,
            commands::position::delete_position,
            commands::position::get_position_stats,
            commands::position::get_portfolio_summary,
            commands::position::get_all_portfolio_summaries,
            commands::position::get_portfolios,
            commands::position::get_portfolio_positions,
            commands::position::get_portfolio_profit_loss_view,
            commands::position::fetch_stock_name,
            commands::position::get_closed_trades_summary,

            // 数据库管理命令
            commands::position::reset_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}