use wasm_bindgen::prelude::*;
use web_sys::*;
use js_sys::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SwapManager;

#[wasm_bindgen]
impl SwapManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SwapManager {
        SwapManager
    }

    pub fn swap_content(&self, target: &Element, content: &str, swap_style: Option<String>) {
        let swap_style = swap_style.unwrap_or_else(|| "innerHTML".to_string());
        
        match swap_style.as_str() {
            "innerHTML" => self.swap_inner_html(target, content),
            "outerHTML" => self.swap_outer_html(target, content),
            "beforebegin" => self.swap_before_begin(target, content),
            "afterbegin" => self.swap_after_begin(target, content),
            "beforeend" => self.swap_before_end(target, content),
            "afterend" => self.swap_after_end(target, content),
            "delete" => self.swap_delete(target),
            "none" => {}, // Do nothing
            _ => self.swap_inner_html(target, content), // Default fallback
        }
    }

    fn swap_inner_html(&self, target: &Element, content: &str) {
        target.set_inner_html(content);
    }

    fn swap_outer_html(&self, target: &Element, content: &str) {
        target.set_outer_html(content);
    }

    fn swap_before_begin(&self, target: &Element, content: &str) {
        let _ = target.insert_adjacent_html(&"beforebegin".to_string(), content);
    }

    fn swap_after_begin(&self, target: &Element, content: &str) {
        let _ = target.insert_adjacent_html(&"afterbegin".to_string(), content);
    }

    fn swap_before_end(&self, target: &Element, content: &str) {
        let _ = target.insert_adjacent_html(&"beforeend".to_string(), content);
    }

    fn swap_after_end(&self, target: &Element, content: &str) {
        let _ = target.insert_adjacent_html(&"afterend".to_string(), content);
    }

    fn swap_delete(&self, target: &Element) {
        if let Some(parent) = target.parent_element() {
            let _ = parent.remove_child(target);
        }
    }

    pub fn get_swap_specification(&self, element: &Element, swap_override: Option<String>) -> SwapSpec {
        let swap_info = swap_override
            .or_else(|| element.get_attribute(&"hx-swap".to_string()))
            .unwrap_or_else(|| "innerHTML".to_string());

        let mut spec = SwapSpec {
            swap_style: "innerHTML".to_string(),
            swap_delay: 0,
            settle_delay: 20,
            transition: false,
            ignore_title: false,
            scroll: None,
            scroll_target: None,
            show: None,
            show_target: None,
            focus_scroll: None,
        };

        if !swap_info.is_empty() {
            let parts: Vec<&str> = swap_info.split_whitespace().collect();
            
            for (i, part) in parts.iter().enumerate() {
                if i == 0 {
                    spec.swap_style = part.to_string();
                } else if part.starts_with(&"swap:".to_string()) {
                    if let Ok(delay) = part[5..].parse::<u32>() {
                        spec.swap_delay = delay;
                    }
                } else if part.starts_with(&"settle:".to_string()) {
                    if let Ok(delay) = part[7..].parse::<u32>() {
                        spec.settle_delay = delay;
                    }
                } else if part.starts_with(&"transition:".to_string()) {
                    spec.transition = &part[11..] == &"true".to_string();
                } else if part.starts_with(&"ignoreTitle:".to_string()) {
                    spec.ignore_title = &part[12..] == &"true".to_string();
                } else if part.starts_with(&"scroll:".to_string()) {
                    let scroll_spec = &part[7..];
                    if let Some(colon_pos) = scroll_spec.find(&":".to_string()) {
                        spec.scroll = Some(scroll_spec[colon_pos + 1..].to_string());
                        spec.scroll_target = Some(scroll_spec[..colon_pos].to_string());
                    } else {
                        spec.scroll = Some(scroll_spec.to_string());
                    }
                } else if part.starts_with(&"show:".to_string()) {
                    let show_spec = &part[5..];
                    if let Some(colon_pos) = show_spec.find(&":".to_string()) {
                        spec.show = Some(show_spec[colon_pos + 1..].to_string());
                        spec.show_target = Some(show_spec[..colon_pos].to_string());
                    } else {
                        spec.show = Some(show_spec.to_string());
                    }
                } else if part.starts_with(&"focus-scroll:".to_string()) {
                    spec.focus_scroll = Some(&part[13..] == &"true".to_string());
                }
            }
        }

        spec
    }

    pub fn handle_oob_swaps(&self, fragment: &DocumentFragment) {
        let oob_elements = fragment.query_selector_all(&"[hx-swap-oob], [data-hx-swap-oob]".to_string()).unwrap();
        
        for i in 0..oob_elements.length() {
            if let Some(oob_element) = oob_elements.item(i) {
                if let Some(element) = oob_element.dyn_ref::<Element>() {
                    if let Some(oob_value) = element.get_attribute(&"hx-swap-oob".to_string())
                        .or_else(|| element.get_attribute(&"data-hx-swap-oob".to_string())) {
                        self.process_oob_swap(element, &oob_value);
                    }
                }
            }
        }
    }

    fn process_oob_swap(&self, oob_element: &Element, oob_value: &str) {
        let (swap_style, selector) = if oob_value == "true".to_string() {
            ("outerHTML".to_string(), "#".to_string() + &oob_element.id())
        } else if let Some(colon_pos) = oob_value.find(&":".to_string()) {
            (oob_value[..colon_pos].to_string(), oob_value[colon_pos + 1..].to_string())
        } else {
            (oob_value.to_string(), "#".to_string() + &oob_element.id())
        };

        let document = web_sys::window().unwrap().document().unwrap();
        if let Ok(Some(target)) = document.query_selector(&selector) {
            let content = oob_element.outer_html();
            self.swap_content(&target, &content, Some(swap_style));
        }

        // Remove the oob attributes
        oob_element.remove_attribute(&"hx-swap-oob".to_string());
        oob_element.remove_attribute(&"data-hx-swap-oob".to_string());
    }

    pub fn update_scroll_state(&self, elements: &[Element], spec: &SwapSpec) {
        if let Some(scroll) = &spec.scroll {
            let target = if let Some(scroll_target) = &spec.scroll_target {
                let document = web_sys::window().unwrap().document().unwrap();
                document.query_selector(scroll_target).unwrap()
            } else {
                elements.first().cloned()
            };

            if let Some(target) = target {
                match scroll.as_str() {
                    "top" => {
                        if let Some(element) = target.dyn_ref::<HtmlElement>() {
                            element.set_scroll_top(0);
                        }
                    },
                    "bottom" => {
                        if let Some(element) = target.dyn_ref::<HtmlElement>() {
                            element.set_scroll_top(element.scroll_height());
                        }
                    },
                    _ => {
                        if let Ok(scroll_pos) = scroll.parse::<i32>() {
                            web_sys::window().unwrap().scroll_to_with_x_and_y(0.0, scroll_pos as f64);
                        }
                    }
                }
            }
        }

        if let Some(show) = &spec.show {
            let target = if let Some(show_target) = &spec.show_target {
                let document = web_sys::window().unwrap().document().unwrap();
                document.query_selector(show_target).unwrap()
            } else {
                elements.first().cloned()
            };

            if let Some(target) = target {
                let scroll_into_view_options = ScrollIntoViewOptions::new();
                match show.as_str() {
                    "top" => {
                        scroll_into_view_options.set_block(ScrollLogicalPosition::Start);
                    },
                    "bottom" => {
                        scroll_into_view_options.set_block(ScrollLogicalPosition::End);
                    },
                    _ => {}
                }
                target.scroll_into_view_with_scroll_into_view_options(&scroll_into_view_options);
            }
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SwapSpec {
    pub swap_style: String,
    pub swap_delay: u32,
    pub settle_delay: u32,
    pub transition: bool,
    pub ignore_title: bool,
    pub scroll: Option<String>,
    pub scroll_target: Option<String>,
    pub show: Option<String>,
    pub show_target: Option<String>,
    pub focus_scroll: Option<bool>,
}

#[wasm_bindgen]
impl SwapSpec {
    #[wasm_bindgen(getter)]
    pub fn swap_style(&self) -> String {
        self.swap_style.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn swap_delay(&self) -> u32 {
        self.swap_delay
    }

    #[wasm_bindgen(getter)]
    pub fn settle_delay(&self) -> u32 {
        self.settle_delay
    }
}