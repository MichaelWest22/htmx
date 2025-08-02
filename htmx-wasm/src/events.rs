use wasm_bindgen::prelude::*;
use web_sys::*;
use js_sys::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct EventManager;

#[wasm_bindgen]
impl EventManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EventManager {
        EventManager
    }

    pub fn add_event_listener(&self, event_name: &str, selector: &str, handler: &Function) {
        let document = web_sys::window().unwrap().document().unwrap();
        let elements = document.query_selector_all(&selector.to_string()).unwrap();
        
        for i in 0..elements.length() {
            if let Some(element) = elements.item(i) {
                if let Some(element) = element.dyn_ref::<Element>() {
                    let _ = element.add_event_listener_with_callback(&event_name.to_string(), handler);
                }
            }
        }
    }

    pub fn trigger_event(&self, element: &Element, event_name: &str, detail: &JsValue) {
        let event_init = CustomEventInit::new();
        event_init.set_detail(detail);
        event_init.set_bubbles(true);
        event_init.set_cancelable(true);
        
        if let Ok(event) = CustomEvent::new_with_event_init_dict(&event_name.to_string(), &event_init) {
            let _ = element.dispatch_event(&event);
        }
    }

    pub fn make_event(&self, event_name: &str, detail: &JsValue) -> CustomEvent {
        let event_init = CustomEventInit::new();
        event_init.set_detail(detail);
        event_init.set_bubbles(true);
        event_init.set_cancelable(true);
        
        CustomEvent::new_with_event_init_dict(&event_name.to_string(), &event_init).unwrap()
    }

    pub fn trigger_error_event(&self, element: &Element, event_name: &str, error_detail: &JsValue) {
        let error_obj = Object::new();
        Reflect::set(&error_obj, &"error".to_string().into(), &event_name.into()).unwrap();
        if !error_detail.is_undefined() {
            Reflect::set(&error_obj, &"detail".to_string().into(), error_detail).unwrap();
        }
        
        self.trigger_event(element, event_name, &error_obj.into());
    }

    pub fn add_htmx_event_listener(&self, element: &Element, event_name: &str, callback: &Closure<dyn FnMut(Event)>) {
        let _ = element.add_event_listener_with_callback(&event_name.to_string(), callback.as_ref().unchecked_ref());
    }

    pub fn trigger_htmx_event(&self, element: &Element, event_name: &str) {
        self.trigger_event(element, event_name, &JsValue::undefined());
    }

    pub fn on_load(&self, callback: &Function) -> Result<(), JsValue> {
        let document = web_sys::window().unwrap().document().unwrap();
        
        let load_handler = Closure::wrap(Box::new(move |event: Event| {
            if let Some(target) = event.target() {
                if let Some(element) = target.dyn_ref::<Element>() {
                    let _ = callback.call1(&JsValue::null(), &element.into());
                }
            }
        }) as Box<dyn FnMut(Event)>);
        
        document.add_event_listener_with_callback(&"htmx:load".to_string(), load_handler.as_ref().unchecked_ref())?;
        load_handler.forget();
        
        Ok(())
    }

    pub fn trigger_load_event(&self, element: &Element) {
        let detail = Object::new();
        Reflect::set(&detail, &"elt".to_string().into(), &element.into()).unwrap();
        
        self.trigger_event(element, &"htmx:load".to_string(), &detail.into());
    }

    pub fn trigger_before_request(&self, element: &Element, request_info: &JsValue) -> bool {
        let event = self.make_event(&"htmx:beforeRequest".to_string(), request_info);
        element.dispatch_event(&event).unwrap_or(false)
    }

    pub fn trigger_after_request(&self, element: &Element, response_info: &JsValue) {
        self.trigger_event(element, &"htmx:afterRequest".to_string(), response_info);
    }

    pub fn trigger_before_swap(&self, element: &Element, swap_info: &JsValue) -> bool {
        let event = self.make_event(&"htmx:beforeSwap".to_string(), swap_info);
        element.dispatch_event(&event).unwrap_or(false)
    }

    pub fn trigger_after_swap(&self, element: &Element, swap_info: &JsValue) {
        self.trigger_event(element, &"htmx:afterSwap".to_string(), swap_info);
    }

    pub fn trigger_after_settle(&self, element: &Element, settle_info: &JsValue) {
        self.trigger_event(element, &"htmx:afterSettle".to_string(), settle_info);
    }
}