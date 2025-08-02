use wasm_bindgen::prelude::*;
use web_sys::*;
use js_sys::*;

mod config;
mod dom;
mod events;
mod ajax;
mod swap;
mod triggers;

use config::HtmxConfig;
use dom::DomUtils;
use events::EventManager;
use ajax::AjaxManager;
use swap::SwapManager;
use triggers::TriggerManager;

#[wasm_bindgen]
pub struct Htmx {
    config: HtmxConfig,
    dom_utils: DomUtils,
    event_manager: EventManager,
    ajax_manager: AjaxManager,
    swap_manager: SwapManager,
    trigger_manager: TriggerManager,
}

#[wasm_bindgen]
impl Htmx {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Htmx {
        console_error_panic_hook::set_once();
        
        Htmx {
            config: HtmxConfig::new(),
            dom_utils: DomUtils::new(),
            event_manager: EventManager::new(),
            ajax_manager: AjaxManager::new(),
            swap_manager: SwapManager::new(),
            trigger_manager: TriggerManager::new(),
        }
    }

    #[wasm_bindgen(getter)]
    pub fn version(&self) -> String {
        "2.0.6-wasm".to_string()
    }

    #[wasm_bindgen]
    pub fn process(&self, element: &Element) -> Result<(), JsValue> {
        self.process_node(element)
    }

    #[wasm_bindgen]
    pub fn find(&self, selector: &str) -> Option<Element> {
        self.dom_utils.find(selector)
    }

    #[wasm_bindgen]
    pub fn find_all(&self, selector: &str) -> NodeList {
        self.dom_utils.find_all(selector)
    }

    #[wasm_bindgen]
    pub fn on(&self, event_name: &str, selector: &str, handler: &Function) {
        self.event_manager.add_event_listener(event_name, selector, handler);
    }

    #[wasm_bindgen]
    pub fn trigger(&self, element: &Element, event_name: &str, detail: &JsValue) {
        self.event_manager.trigger_event(element, event_name, detail);
    }

    #[wasm_bindgen]
    pub fn ajax(&self, verb: &str, path: &str, element: Option<Element>) -> Promise {
        self.ajax_manager.issue_request(verb, path, element)
    }

    #[wasm_bindgen]
    pub fn swap(&self, target: &Element, content: &str, swap_style: Option<String>) {
        self.swap_manager.swap_content(target, content, swap_style);
    }

    fn process_node(&self, element: &Element) -> Result<(), JsValue> {
        // Process htmx attributes on the element
        self.process_triggers(element)?;
        self.process_verbs(element)?;
        self.process_boost(element)?;
        
        // Process child elements
        let children = element.children();
        for i in 0..children.length() {
            if let Some(child) = children.item(i) {
                self.process_node(&child)?;
            }
        }
        
        Ok(())
    }

    fn process_triggers(&self, element: &Element) -> Result<(), JsValue> {
        if let Some(trigger_attr) = element.get_attribute("hx-trigger") {
            self.trigger_manager.parse_and_bind_triggers(element, &trigger_attr)?;
        }
        Ok(())
    }

    fn process_verbs(&self, element: &Element) -> Result<(), JsValue> {
        let verbs = ["get", "post", "put", "delete", "patch"];
        
        for verb in &verbs {
            let attr_name = format!("hx-{}", verb);
            if let Some(path) = element.get_attribute(&attr_name) {
                self.bind_verb_handler(element, verb, &path)?;
            }
        }
        
        Ok(())
    }

    fn process_boost(&self, element: &Element) -> Result<(), JsValue> {
        if element.get_attribute("hx-boost").as_deref() == Some("true") {
            self.boost_element(element)?;
        }
        Ok(())
    }

    fn bind_verb_handler(&self, element: &Element, verb: &str, path: &str) -> Result<(), JsValue> {
        let element_clone = element.clone();
        let verb_clone = verb.to_string();
        let path_clone = path.to_string();
        let ajax_manager = self.ajax_manager.clone();
        
        let closure = Closure::wrap(Box::new(move |_event: Event| {
            ajax_manager.issue_request(&verb_clone, &path_clone, Some(element_clone.clone()));
        }) as Box<dyn FnMut(Event)>);
        
        element.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
        
        Ok(())
    }

    fn boost_element(&self, element: &Element) -> Result<(), JsValue> {
        if element.tag_name() == "A" {
            self.boost_anchor(element)?;
        } else if element.tag_name() == "FORM" {
            self.boost_form(element)?;
        }
        Ok(())
    }

    fn boost_anchor(&self, element: &Element) -> Result<(), JsValue> {
        if let Some(href) = element.get_attribute("href") {
            let element_clone = element.clone();
            let ajax_manager = self.ajax_manager.clone();
            
            let closure = Closure::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                ajax_manager.issue_request("get", &href, Some(element_clone.clone()));
            }) as Box<dyn FnMut(Event)>);
            
            element.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
            closure.forget();
        }
        Ok(())
    }

    fn boost_form(&self, element: &Element) -> Result<(), JsValue> {
        let form = element.dyn_ref::<HtmlFormElement>().unwrap();
        let method = form.method();
        let action = form.action();
        
        let element_clone = element.clone();
        let ajax_manager = self.ajax_manager.clone();
        
        let closure = Closure::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            ajax_manager.issue_request(&method, &action, Some(element_clone.clone()));
        }) as Box<dyn FnMut(Event)>);
        
        element.add_event_listener_with_callback("submit", closure.as_ref().unchecked_ref())?;
        closure.forget();
        
        Ok(())
    }
}

#[wasm_bindgen(start)]
pub fn main() {
    let htmx = Htmx::new();
    
    // Attach to global window object
    let window = web_sys::window().unwrap();
    let global = js_sys::global();
    
    js_sys::Reflect::set(&global, &"htmx".into(), &htmx.into()).unwrap();
    
    // Process the document when DOM is ready
    let document = window.document().unwrap();
    let body = document.body().unwrap();
    htmx.process(&body).unwrap();
}