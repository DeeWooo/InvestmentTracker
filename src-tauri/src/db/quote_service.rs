/// 实时行情服务
/// 对应 Java 版本的 RealQuoteService
/// 负责从外部 API 获取股票实时价格

use crate::models::RealQuote;
use crate::error::{AppError, Result};
use std::collections::HashMap;

/// 行情服务
pub struct QuoteService;

impl QuoteService {
    /// 批量获取股票实时价格
    ///
    /// 参数：
    /// - codes: 股票代码列表
    ///
    /// 返回：
    /// - HashMap<String, RealQuote>: code -> RealQuote 映射
    pub async fn fetch_real_quotes(codes: Vec<String>) -> Result<HashMap<String, RealQuote>> {
        let mut quotes = HashMap::new();

        for code in codes {
            match Self::fetch_single_quote(&code).await {
                Ok(quote) => {
                    quotes.insert(code.clone(), quote);
                }
                Err(e) => {
                    // 记录错误但继续处理其他股票
                    eprintln!("获取 {} 价格失败: {}", code, e);
                }
            }
        }

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
        let url = format!("http://qt.gtimg.cn/q={}", code);

        // 使用 reqwest 发送HTTP请求
        let response = reqwest::get(&url)
            .await
            .map_err(|e| AppError::Business(format!("请求API失败: {}", e)))?;

        let text = response
            .text()
            .await
            .map_err(|e| AppError::Business(format!("读取响应失败: {}", e)))?;

        // 解析响应
        Self::parse_quote_response(&text, code)
    }

    /// 解析腾讯行情API响应
    fn parse_quote_response(text: &str, code: &str) -> Result<RealQuote> {
        // 提取引号内的内容
        let start = text
            .find('"')
            .ok_or_else(|| AppError::Business("无效的响应格式".to_string()))?;

        let end = text[start + 1..]
            .find('"')
            .ok_or_else(|| AppError::Business("无效的响应格式".to_string()))?;

        let data = &text[start + 1..start + 1 + end];

        // 按 ~ 分割
        let fields: Vec<&str> = data.split('~').collect();

        if fields.len() < 4 {
            return Err(AppError::Business(format!(
                "股票 {} 数据字段不足",
                code
            )));
        }

        let name = fields[1].to_string();
        let price_str = fields[3];

        let real_price: f64 = price_str
            .parse()
            .map_err(|e| AppError::Business(format!("解析价格失败: {}", e)))?;

        Ok(RealQuote::new(code.to_string(), name, real_price))
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
