/// 应用错误类型定义
/// 统一的错误处理机制

use serde_json::json;
use serde::Serialize;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    /// 数据库相关错误
    Database(String),

    /// 数据未找到错误
    NotFound(String),

    /// 输入数据无效错误
    InvalidInput(String),

    /// 业务逻辑错误
    Business(String),

    /// IO 操作错误
    Io(String),

    /// 序列化/反序列化错误
    Serialization(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::Database(msg) => write!(f, "数据库错误: {}", msg),
            AppError::NotFound(msg) => write!(f, "未找到: {}", msg),
            AppError::InvalidInput(msg) => write!(f, "输入无效: {}", msg),
            AppError::Business(msg) => write!(f, "业务错误: {}", msg),
            AppError::Io(msg) => write!(f, "IO错误: {}", msg),
            AppError::Serialization(msg) => write!(f, "序列化错误: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

/// 错误响应的 JSON 结构
#[derive(serde::Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: i32,
    pub details: Option<String>,
}

impl ErrorResponse {
    pub fn database_error(msg: impl Into<String>) -> Self {
        Self {
            error: msg.into(),
            code: 500,
            details: None,
        }
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self {
            error: msg.into(),
            code: 404,
            details: None,
        }
    }

    pub fn invalid_input(msg: impl Into<String>) -> Self {
        Self {
            error: msg.into(),
            code: 400,
            details: None,
        }
    }

    pub fn business_error(msg: impl Into<String>) -> Self {
        Self {
            error: msg.into(),
            code: 422,
            details: None,
        }
    }
}

/// 便于错误处理的宏
#[macro_export]
macro_rules! db_error {
    ($msg:expr) => {
        crate::error::AppError::Database($msg.to_string())
    };
    ($fmt:expr, $($arg:tt)*) => {
        crate::error::AppError::Database(format!($fmt, $($arg)*))
    };
}

#[macro_export]
macro_rules! not_found {
    ($msg:expr) => {
        crate::error::AppError::NotFound($msg.to_string())
    };
    ($fmt:expr, $($arg:tt)*) => {
        crate::error::AppError::NotFound(format!($fmt, $($arg)*))
    };
}

#[macro_export]
macro_rules! invalid_input {
    ($msg:expr) => {
        crate::error::AppError::InvalidInput($msg.to_string())
    };
    ($fmt:expr, $($arg:tt)*) => {
        crate::error::AppError::InvalidInput(format!($fmt, $($arg)*))
    };
}

#[macro_export]
macro_rules! business_error {
    ($msg:expr) => {
        crate::error::AppError::Business($msg.to_string())
    };
    ($fmt:expr, $($arg:tt)*) => {
        crate::error::AppError::Business(format!($fmt, $($arg)*))
    };
}

/// 为 Tauri 实现错误序列化
/// Tauri 2 会将实现了 Serialize 的错误序列化为 JSON 传递给前端
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(Some(3))?;
        
        // 提取原始错误消息（不带前缀）
        let raw_message = match self {
            AppError::Database(msg) => msg,
            AppError::NotFound(msg) => msg,
            AppError::InvalidInput(msg) => msg,
            AppError::Business(msg) => msg,
            AppError::Io(msg) => msg,
            AppError::Serialization(msg) => msg,
        };
        
        map.serialize_entry("message", raw_message)?;
        map.serialize_entry("display", &self.to_string())?; // 带前缀的完整消息
        map.serialize_entry("code", match self {
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::InvalidInput(_) => "INVALID_INPUT",
            AppError::Business(_) => "BUSINESS_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
        })?;
        map.end()
    }
}