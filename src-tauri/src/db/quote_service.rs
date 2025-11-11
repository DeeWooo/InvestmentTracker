/// 实时行情服务
/// 对应 Java 版本的 RealQuoteService
/// 负责从外部 API 获取股票实时价格

use crate::models::RealQuote;
use crate::error::{AppError, Result};
use std::collections::HashMap;

/// 行情服务
pub struct QuoteService;

impl QuoteService {
    /// 格式化股票代码为腾讯API格式
    ///
    /// 规则：
    /// - 6位数字且以6开头：上海股票，添加 sh 前缀
    /// - 6位数字且以0或3开头：深圳股票，添加 sz 前缀
    /// - 已有前缀：保持不变
    pub fn format_stock_code(code: &str) -> String {
        // 如果已有前缀，直接返回
        if code.starts_with("sh") || code.starts_with("sz") {
            return code.to_string();
        }

        // 清理代码（只保留数字）
        let clean_code: String = code.chars().filter(|c| c.is_ascii_digit()).collect();

        // 如果不是6位数字，返回原代码（可能已经是正确格式）
        if clean_code.len() != 6 {
            return code.to_string();
        }

        // 根据首位数字添加前缀
        match clean_code.chars().next() {
            Some('6') => format!("sh{}", clean_code),  // 上海证券交易所
            Some('0' | '3') => format!("sz{}", clean_code),  // 深圳证券交易所
            _ => code.to_string(),  // 其他情况保持原样
        }
    }

    /// 批量获取股票实时价格
    ///
    /// 参数：
    /// - codes: 股票代码列表
    ///
    /// 返回：
    /// - HashMap<String, RealQuote>: code -> RealQuote 映射
    pub async fn fetch_real_quotes(codes: Vec<String>) -> Result<HashMap<String, RealQuote>> {
        let mut quotes = HashMap::new();

        println!("开始批量获取实时价格，股票代码列表: {:?}", codes);

        for code in codes {
            match Self::fetch_single_quote(&code).await {
                Ok(quote) => {
                    println!("✅ 成功获取股票 {} 的价格数据:", code);
                    println!("   - 股票代码: {}", quote.code);
                    println!("   - 股票名称: {}", quote.name);
                    println!("   - 当前价格: {}", quote.real_price);
                    quotes.insert(code.clone(), quote);
                }
                Err(e) => {
                    // 记录错误但继续处理其他股票
                    eprintln!("❌ 获取 {} 价格失败: {}", code, e);
                }
            }
        }

        println!("批量获取完成，成功获取 {} 只股票的价格", quotes.len());

        Ok(quotes)
    }

    /// 获取单个股票的实时价格
    ///
    /// 使用腾讯财经 API: http://qt.gtimg.cn/q={code}
    ///
    /// 返回格式示例:
    /// v_sh600519="51~贵州茅台~600519~1850.00~...~3.45~..."
    /// 字段说明: 0=未知, 1=名称, 2=代码, 3=当前价格...
    async fn fetch_single_quote(code: &str) -> Result<RealQuote> {
        // 标准化股票代码格式
        let formatted_code = Self::format_stock_code(code);
        let url = format!("http://qt.gtimg.cn/q={}", formatted_code);

        println!("📡 请求股票 {} 的实时价格:", code);
        println!("   - 原始代码: {}", code);
        println!("   - 格式化代码: {}", formatted_code);
        println!("   - 请求URL: {}", url);

        // 使用 reqwest 发送HTTP请求
        let response = reqwest::get(&url)
            .await
            .map_err(|e| AppError::Business(format!("请求API失败: {}", e)))?;

        let text = response
            .text()
            .await
            .map_err(|e| AppError::Business(format!("读取响应失败: {}", e)))?;

        println!("📥 收到API响应:");
        println!("   - 响应内容: {}", text);

        // 解析响应
        let result = Self::parse_quote_response(&text, code)?;

        println!("✅ 解析成功:");
        println!("   - 股票代码: {}", result.code);
        println!("   - 股票名称: {}", result.name);
        println!("   - 当前价格: {}", result.real_price);

        Ok(result)
    }

    /// 解析腾讯行情API响应
    fn parse_quote_response(text: &str, original_code: &str) -> Result<RealQuote> {
        println!("🔍 开始解析API响应，原始代码: {}", original_code);

        // 提取引号内的内容
        let start = text
            .find('"')
            .ok_or_else(|| AppError::Business("无效的响应格式".to_string()))?;

        let end = text[start + 1..]
            .find('"')
            .ok_or_else(|| AppError::Business("无效的响应格式".to_string()))?;

        let data = &text[start + 1..start + 1 + end];

        println!("   - 提取的数据: {}", data);

        // 按 ~ 分割
        let fields: Vec<&str> = data.split('~').collect();

        println!("   - 分割后的字段数: {}", fields.len());
        for (i, field) in fields.iter().take(10).enumerate() {
            println!("     [{}] = \"{}\"", i, field);
        }

        if fields.len() < 4 {
            return Err(AppError::Business(format!(
                "股票 {} 数据字段不足，响应: {}",
                original_code, data
            )));
        }

        let name = fields[1].to_string();
        let price_str = fields[3];

        println!("   - 提取的字段:");
        println!("     [1] 股票名称: {}", name);
        println!("     [3] 价格字符串: \"{}\"", price_str);

        // 检查价格是否为空或无效
        if price_str.is_empty() || price_str == "--" {
            return Err(AppError::Business(format!(
                "股票 {} 暂停或无价格数据",
                original_code
            )));
        }

        let real_price: f64 = price_str
            .parse()
            .map_err(|e| AppError::Business(format!("解析价格失败 '{}': {}", price_str, e)))?;

        println!("   - 解析后的价格: {}", real_price);

        Ok(RealQuote::new(original_code.to_string(), name, real_price))
    }

    /// 生成模拟数据（用于开发测试）
    pub fn mock_quotes(codes: Vec<String>) -> HashMap<String, RealQuote> {
        let mut quotes = HashMap::new();

        for code in codes {
            // 使用模拟数据
            let name = format!("模拟股票{}", code);
            let real_price = 10.0 + (code.len() as f64 * 0.5); // 简单的模拟价格

            quotes.insert(
                code.clone(),
                RealQuote::new(code, name, real_price),
            );
        }

        quotes
    }
}
