use wasm_bindgen::prelude::*;
use web_sys::*;
use js_sys::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct TriggerManager;

#[wasm_bindgen]
impl TriggerManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TriggerManager {
        TriggerManager
    }

    pub fn parse_and_bind_triggers(&self, element: &Element, trigger_spec: &str) -> Result<(), JsValue> {
        let triggers = self.parse_trigger_spec(trigger_spec);
        
        for trigger in triggers {
            self.bind_trigger(element, &trigger)?;
        }
        
        Ok(())
    }

    fn parse_trigger_spec(&self, spec: &str) -> Vec<TriggerSpec> {
        let mut triggers = Vec::new();
        let parts: Vec<&str> = spec.split(&",".to_string()).collect();
        
        for part in parts {
            let part = part.trim();
            if part.is_empty() {
                continue;
            }
            
            let mut trigger = TriggerSpec {
                trigger: "click".to_string(),
                from: None,
                changed: false,
                once: false,
                consume: false,
                delay: None,
                throttle: None,
                queue: None,
                target: None,
                poll_interval: None,
                event_filter: None,
            };
            
            let tokens: Vec<&str> = part.split_whitespace().collect();
            if let Some(first_token) = tokens.first() {
                trigger.trigger = first_token.to_string();
                
                // Parse modifiers
                for token in tokens.iter().skip(1) {
                    match *token {
                        "changed" => trigger.changed = true,
                        "once" => trigger.once = true,
                        "consume" => trigger.consume = true,
                        token if token.starts_with(&"delay:".to_string()) => {
                            if let Ok(delay) = token[6..].parse::<u32>() {
                                trigger.delay = Some(delay);
                            }
                        },
                        token if token.starts_with(&"throttle:".to_string()) => {
                            if let Ok(throttle) = token[9..].parse::<u32>() {
                                trigger.throttle = Some(throttle);
                            }
                        },
                        token if token.starts_with(&"from:".to_string()) => {
                            trigger.from = Some(token[5..].to_string());
                        },
                        token if token.starts_with(&"target:".to_string()) => {
                            trigger.target = Some(token[7..].to_string());
                        },
                        token if token.starts_with(&"queue:".to_string()) => {
                            trigger.queue = Some(token[6..].to_string());
                        },
                        _ => {}
                    }
                }
            }
            
            triggers.push(trigger);
        }
        
        triggers
    }

    fn bind_trigger(&self, element: &Element, trigger_spec: &TriggerSpec) -> Result<(), JsValue> {
        let event_name = &trigger_spec.trigger;
        
        // Determine the elements to listen on
        let listen_elements = if let Some(from_selector) = &trigger_spec.from {
            self.query_selector_all(element, from_selector)
        } else {
            vec![element.clone()]
        };
        
        for listen_element in listen_elements {
            self.add_trigger_listener(&listen_element, event_name, trigger_spec)?;
        }
        
        Ok(())
    }

    fn add_trigger_listener(&self, element: &Element, event_name: &str, spec: &TriggerSpec) -> Result<(), JsValue> {
        let element_clone = element.clone();
        let spec_clone = spec.clone();
        
        let closure = Closure::wrap(Box::new(move |event: Event| {
            // Handle trigger logic
            if spec_clone.consume {
                event.stop_propagation();
            }
            
            // Check target filter
            if let Some(target_selector) = &spec_clone.target {
                if let Some(event_target) = event.target() {
                    if let Some(target_element) = event_target.dyn_ref::<Element>() {
                        if !target_element.matches(&target_selector.to_string()).unwrap_or(false) {
                            return;
                        }
                    }
                }
            }
            
            // Handle delay
            if let Some(delay) = spec_clone.delay {
                let element_clone = element_clone.clone();
                let timeout_closure = Closure::wrap(Box::new(move || {
                    // Trigger the actual action after delay
                    // This would normally call the AJAX request or other action
                }) as Box<dyn FnMut()>);
                
                web_sys::window().unwrap()
                    .set_timeout_with_callback_and_timeout_and_arguments_0(
                        timeout_closure.as_ref().unchecked_ref(),
                        delay as i32
                    ).unwrap();
                timeout_closure.forget();
                return;
            }
            
            // Handle throttle
            if let Some(_throttle) = spec_clone.throttle {
                // Throttle implementation would go here
            }
            
            // Trigger the actual action
            // This would normally call the AJAX request or other htmx action
        }) as Box<dyn FnMut(Event)>);
        
        element.add_event_listener_with_callback(event_name, closure.as_ref().unchecked_ref())?;
        closure.forget();
        
        Ok(())
    }

    fn query_selector_all(&self, context: &Element, selector: &str) -> Vec<Element> {
        let mut elements = Vec::new();
        
        if let Ok(node_list) = context.query_selector_all(selector) {
            for i in 0..node_list.length() {
                if let Some(node) = node_list.item(i) {
                    if let Some(element) = node.dyn_ref::<Element>() {
                        elements.push(element.clone());
                    }
                }
            }
        }
        
        elements
    }

    pub fn get_default_trigger(&self, element: &Element) -> String {
        match element.tag_name().as_str() {
            "FORM" => "submit".to_string(),
            "INPUT" => {
                if let Some(input_type) = element.get_attribute(&"type".to_string()) {
                    match input_type.as_str() {
                        "button" | "submit" => "click".to_string(),
                        _ => "change".to_string(),
                    }
                } else {
                    "change".to_string()
                }
            },
            "SELECT" | "TEXTAREA" => "change".to_string(),
            _ => "click".to_string(),
        }
    }

    pub fn process_polling(&self, element: &Element, interval: u32) -> Result<(), JsValue> {
        let element_clone = element.clone();
        
        let interval_closure = Closure::wrap(Box::new(move || {
            // Check if element is still in DOM
            let document = web_sys::window().unwrap().document().unwrap();
            if let Some(body) = document.body() {
                if body.contains(Some(&element_clone)) {
                    // Trigger polling event
                    let event_init = CustomEventInit::new();
                    event_init.set_bubbles(true);
                    
                    if let Ok(event) = CustomEvent::new_with_event_init_dict(&"hx:poll:trigger".to_string(), &event_init) {
                        let _ = element_clone.dispatch_event(&event);
                    }
                }
            }
        }) as Box<dyn FnMut()>);
        
        web_sys::window().unwrap()
            .set_interval_with_callback_and_timeout_and_arguments_0(
                interval_closure.as_ref().unchecked_ref(),
                interval as i32
            )?;
        interval_closure.forget();
        
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct TriggerSpec {
    pub trigger: String,
    pub from: Option<String>,
    pub changed: bool,
    pub once: bool,
    pub consume: bool,
    pub delay: Option<u32>,
    pub throttle: Option<u32>,
    pub queue: Option<String>,
    pub target: Option<String>,
    pub poll_interval: Option<u32>,
    pub event_filter: Option<String>,
}