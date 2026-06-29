//! QuickBooks Online integration for Mint.

pub mod api;
pub mod cmds;
pub mod mapper;
pub mod oauth;

pub const QB_SERVICE: &str = "mint-qb";
pub const QB_PREF_CONNECTION: &str = "preferences.qb_connection";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QbConnectionPrefs {
    pub connected: bool,
    #[serde(default)]
    pub company_name: Option<String>,
    #[serde(default = "default_env")]
    pub environment: String,
    #[serde(default)]
    pub connected_at: Option<String>,
}

fn default_env() -> String {
    "sandbox".to_string()
}

impl Default for QbConnectionPrefs {
    fn default() -> Self {
        Self {
            connected: false,
            company_name: None,
            environment: default_env(),
            connected_at: None,
        }
    }
}

pub fn api_base(environment: &str) -> &'static str {
    if environment == "production" {
        "https://quickbooks.api.intuit.com"
    } else {
        "https://sandbox-quickbooks.api.intuit.com"
    }
}

pub fn oauth_authorize_url(_environment: &str) -> &'static str {
    "https://appcenter.intuit.com/connect/oauth2"
}

pub fn oauth_token_url() -> &'static str {
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
}
