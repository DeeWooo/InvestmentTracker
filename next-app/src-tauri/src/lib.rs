use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Position {
    pub symbol: String,
    pub code: String,
    pub name: String,
    pub quantity: i32,
    pub buy_price: f64,
    pub buy_date: String,
    pub portfolio: String,
    pub pnl: f64,
    pub pnl_percentage: f64,
    pub current_price: f64,
    pub profit10: f64,
    pub profit20: f64,
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
