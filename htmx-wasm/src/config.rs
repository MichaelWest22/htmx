use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtmxConfig {
    pub history_enabled: bool,
    pub history_cache_size: u32,
    pub refresh_on_history_miss: bool,
    pub default_swap_style: String,
    pub default_swap_delay: u32,
    pub default_settle_delay: u32,
    pub include_indicator_styles: bool,
    pub indicator_class: String,
    pub request_class: String,
    pub added_class: String,
    pub settling_class: String,
    pub swapping_class: String,
    pub allow_eval: bool,
    pub allow_script_tags: bool,
    pub with_credentials: bool,
    pub timeout: u32,
    pub disable_selector: String,
    pub scroll_behavior: String,
    pub default_focus_scroll: bool,
    pub get_cache_buster_param: bool,
    pub global_view_transitions: bool,
    pub self_requests_only: bool,
    pub ignore_title: bool,
    pub scroll_into_view_on_boost: bool,
}

#[wasm_bindgen]
impl HtmxConfig {
    #[wasm_bindgen(constructor)]
    pub fn new() -> HtmxConfig {
        HtmxConfig {
            history_enabled: true,
            history_cache_size: 10,
            refresh_on_history_miss: false,
            default_swap_style: "innerHTML".to_string(),
            default_swap_delay: 0,
            default_settle_delay: 20,
            include_indicator_styles: true,
            indicator_class: "htmx-indicator".to_string(),
            request_class: "htmx-request".to_string(),
            added_class: "htmx-added".to_string(),
            settling_class: "htmx-settling".to_string(),
            swapping_class: "htmx-swapping".to_string(),
            allow_eval: true,
            allow_script_tags: true,
            with_credentials: false,
            timeout: 0,
            disable_selector: "[hx-disable], [data-hx-disable]".to_string(),
            scroll_behavior: "instant".to_string(),
            default_focus_scroll: false,
            get_cache_buster_param: false,
            global_view_transitions: false,
            self_requests_only: true,
            ignore_title: false,
            scroll_into_view_on_boost: true,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn history_enabled(&self) -> bool {
        self.history_enabled
    }

    #[wasm_bindgen(setter)]
    pub fn set_history_enabled(&mut self, value: bool) {
        self.history_enabled = value;
    }

    #[wasm_bindgen(getter)]
    pub fn default_swap_style(&self) -> String {
        self.default_swap_style.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_default_swap_style(&mut self, value: String) {
        self.default_swap_style = value;
    }

    #[wasm_bindgen(getter)]
    pub fn timeout(&self) -> u32 {
        self.timeout
    }

    #[wasm_bindgen(setter)]
    pub fn set_timeout(&mut self, value: u32) {
        self.timeout = value;
    }
}