use rusqlite::{Connection, Result as SqliteResult, params};
use uuid::Uuid;

/// 数据库迁移管理器
/// 
/// 迁移版本历史：
/// - v0 -> v1: 重构表结构，添加 UUID 主键
/// - v1 -> v2: 添加 sell_price 和 sell_date 字段
/// - v2 -> v3: 添加 parent_id 字段（支持减仓功能）
pub fn run_migrations(conn: &Connection) -> SqliteResult<()> {
    println!("========================================");
    println!("🔄 开始执行数据库迁移检查");
    println!("========================================");
    
    // 先运行 v0 -> v1 迁移
    migrate_v0_to_v1(conn)?;
    
    // 再运行 v1 -> v2 迁移
    migrate_v1_to_v2(conn)?;
    
    // 运行 v2 -> v3 迁移
    migrate_v2_to_v3(conn)?;
    
    println!("========================================");
    println!("✅ 所有迁移检查完成");
    println!("========================================");
    
    Ok(())
}

/// 数据库迁移：从旧版本 (v0) 升级到新版本 (v1)
///
/// 变更内容：
/// - 主键从 code 改为 id (UUID)
/// - 删除冗余字段：symbol, current_price, pnl, pnl_percentage, profit10, profit20
/// - 新增 status 字段：POSITION / CLOSE
///
/// 迁移步骤：
/// 1. 备份旧表为 positions_old
/// 2. 创建新表 positions (8字段)
/// 3. 迁移数据，为每条生成 UUID
/// 4. 验证数据一致性
pub fn migrate_v0_to_v1(conn: &Connection) -> SqliteResult<()> {
    println!("[迁移] 开始数据库迁移：v0 -> v1");

    // 检查是否已经迁移过
    let table_exists = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='positions'",
        [],
        |row| row.get::<_, i32>(0)
    )?;

    if table_exists == 0 {
        println!("[迁移] 旧表不存在，这是全新数据库，跳过迁移");
        // 注意：表的创建由 get_db_connection() 中的代码处理
        return Ok(());
    }

    // 通过检查 id 列是否存在来判断是否已迁移
    let is_migrated = check_if_migrated(conn)?;
    if is_migrated {
        println!("[迁移] 数据库已经是新版本，跳过迁移");
        return Ok(());
    }

    println!("[迁移] 检测到旧版本，开始迁移...");

    // 步骤 1：重命名旧表
    println!("[迁移] 步骤 1/4：备份旧表");
    conn.execute("ALTER TABLE positions RENAME TO positions_old", [])?;
    println!("[迁移] ✓ 旧表已重命名为 positions_old");

    // 步骤 2：创建新表
    println!("[迁移] 步骤 2/4：创建新表结构");
    conn.execute(
        "CREATE TABLE positions (
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
    )?;
    println!("[迁移] ✓ 新表创建成功");

    // 步骤 3：创建索引
    println!("[迁移] 步骤 3/4：创建索引");
    conn.execute("CREATE INDEX idx_code ON positions(code)", [])?;
    conn.execute("CREATE INDEX idx_status ON positions(status)", [])?;
    println!("[迁移] ✓ 索引创建成功");

    // 步骤 4：迁移数据
    println!("[迁移] 步骤 4/4：迁移数据");
    migrate_data(conn)?;

    // 最后可以删除备份表（注释掉以保留备份）
    // conn.execute("DROP TABLE IF EXISTS positions_old", [])?;
    println!("[迁移] ✓ 数据迁移完成");
    println!("[迁移] ✓ 旧数据备份在 positions_old，可手动删除");

    Ok(())
}

/// 迁移数据从旧表到新表
fn migrate_data(conn: &Connection) -> SqliteResult<()> {
    // 读取旧表数据
    let mut stmt = conn.prepare(
        "SELECT code, name, quantity, buy_price, buy_date, portfolio FROM positions_old"
    )?;

    let records = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,    // code
            row.get::<_, String>(1)?,    // name
            row.get::<_, i32>(2)?,       // quantity
            row.get::<_, f64>(3)?,       // buy_price
            row.get::<_, String>(4)?,    // buy_date
            row.get::<_, Option<String>>(5)?, // portfolio
        ))
    })?;

    let mut count = 0;
    for record_result in records {
        let (code, name, quantity, buy_price, buy_date, portfolio) = record_result?;

        // 为每条记录生成 UUID
        let id = Uuid::new_v4().to_string();

        // 插入新表
        conn.execute(
            "INSERT INTO positions (id, code, name, buy_price, buy_date, quantity, status, portfolio)
             VALUES (?, ?, ?, ?, ?, ?, 'POSITION', ?)",
            params![
                id,
                code,
                name,
                buy_price,
                buy_date,
                quantity,
                portfolio.unwrap_or_else(|| "default".to_string())
            ],
        )?;

        count += 1;
        println!("[迁移] ✓ 迁移记录 {}: code={}, qty={}", count, code, quantity);
    }

    println!("[迁移] 共迁移 {} 条记录", count);
    Ok(())
}

/// 检查是否已迁移到新版本
/// 如果存在 id 列，说明已经是新版本
fn check_if_migrated(conn: &Connection) -> SqliteResult<bool> {
    // 使用 PRAGMA table_info 获取表结构
    let mut stmt = conn.prepare("PRAGMA table_info(positions)")?;

    let rows = stmt.query_map([], |row| {
        let column_name: String = row.get(1)?;
        Ok(column_name)
    })?;

    let has_id_column = rows.into_iter().any(|col| col.as_deref() == Ok("id"));

    Ok(has_id_column)
}

/// 数据库迁移：从 v1 升级到 v2
///
/// 变更内容：
/// - 添加 sell_price 字段：卖出价格
/// - 添加 sell_date 字段：卖出日期
///
/// 这两个字段用于记录卖出操作的详细信息，支持计算实际盈亏
pub fn migrate_v1_to_v2(conn: &Connection) -> SqliteResult<()> {
    println!("[迁移] 检查是否需要 v1 -> v2 迁移");

    // 检查是否已经有 sell_price 字段
    let mut stmt = conn.prepare("PRAGMA table_info(positions)")?;
    let columns: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;

    let has_sell_price = columns.iter().any(|col| col == "sell_price");
    let has_sell_date = columns.iter().any(|col| col == "sell_date");

    if has_sell_price && has_sell_date {
        println!("[迁移] 数据库已经是 v2，跳过迁移");
        return Ok(());
    }

    println!("[迁移] 开始 v1 -> v2 迁移...");

    // 添加 sell_price 字段
    if !has_sell_price {
        println!("[迁移] 添加 sell_price 字段");
        conn.execute("ALTER TABLE positions ADD COLUMN sell_price REAL", [])?;
        println!("[迁移] ✓ sell_price 字段添加成功");
    }

    // 添加 sell_date 字段
    if !has_sell_date {
        println!("[迁移] 添加 sell_date 字段");
        conn.execute("ALTER TABLE positions ADD COLUMN sell_date TEXT", [])?;
        println!("[迁移] ✓ sell_date 字段添加成功");
    }

    println!("[迁移] ✓ v1 -> v2 迁移完成");

    Ok(())
}

/// 数据库迁移：从 v2 升级到 v3
///
/// 变更内容：
/// - 添加 parent_id 字段：用于记录减仓时的持仓关联关系
///
/// 使用场景：
/// - 原始买入：parent_id = NULL
/// - 减仓卖出：parent_id = 原持仓的 id
pub fn migrate_v2_to_v3(conn: &Connection) -> SqliteResult<()> {
    println!("[迁移] 检查是否需要 v2 -> v3 迁移");

    // 检查是否已经有 parent_id 字段
    let mut stmt = conn.prepare("PRAGMA table_info(positions)")?;
    let columns: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;

    let has_parent_id = columns.iter().any(|col| col == "parent_id");

    if has_parent_id {
        println!("[迁移] 数据库已经是 v3，跳过迁移");
        return Ok(());
    }

    println!("[迁移] 开始 v2 -> v3 迁移...");

    // 添加 parent_id 字段
    println!("[迁移] 添加 parent_id 字段");
    conn.execute("ALTER TABLE positions ADD COLUMN parent_id TEXT", [])?;
    println!("[迁移] ✓ parent_id 字段添加成功");

    // 为新字段创建索引，提升查询性能
    println!("[迁移] 创建 parent_id 索引");
    conn.execute("CREATE INDEX IF NOT EXISTS idx_parent_id ON positions(parent_id)", [])?;
    println!("[迁移] ✓ parent_id 索引创建成功");

    println!("[迁移] ✓ v2 -> v3 迁移完成");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_migration() {
        // 创建临时数据库用于测试
        let _ = fs::remove_file("test_migration.db");

        let conn = Connection::open("test_migration.db").unwrap();

        // 创建旧表
        conn.execute(
            "CREATE TABLE positions (
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
        ).unwrap();

        // 插入测试数据
        conn.execute(
            "INSERT INTO positions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params!["600519", "贵州茅台", 100, 1680.5, "2025-01-01", "default",
                    "SH600519", 1850.0, 16950.0, 0.1010, 1848.55, 1848.55],
        ).unwrap();

        // 执行迁移
        migrate_v0_to_v1(&conn).unwrap();

        // 验证新表
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM positions",
            [],
            |row| row.get(0)
        ).unwrap();

        assert_eq!(count, 1, "数据记录数不正确");

        // 验证数据完整性
        let (code, name, qty): (String, String, i32) = conn.query_row(
            "SELECT code, name, quantity FROM positions WHERE code = '600519'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        ).unwrap();

        assert_eq!(code, "600519");
        assert_eq!(name, "贵州茅台");
        assert_eq!(qty, 100);

        // 清理
        let _ = fs::remove_file("test_migration.db");
    }
}
