use rusqlite::{Connection, Result as SqliteResult, params};
use uuid::Uuid;

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
        println!("[迁移] 旧表不存在，跳过迁移");
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
