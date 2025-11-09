use serde::{Deserialize, Serialize};

/// 数据库持仓记录
/// 对应 Java 版本的 PositionEntity，共 8 个字段
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    pub id: String,           // UUID，唯一主键
    pub code: String,         // 股票代码
    pub name: String,         // 股票名称
    pub buy_price: f64,       // 买入价格
    pub buy_date: String,     // 买入日期 (YYYY-MM-DD)
    pub quantity: i32,        // 买入数量
    pub status: String,       // 状态：POSITION 或 CLOSE
    pub portfolio: String,    // 所属投资组合
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
