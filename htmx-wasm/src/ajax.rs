use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::*;
use js_sys::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct AjaxManager;

#[wasm_bindgen]
impl AjaxManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> AjaxManager {
        AjaxManager
    }

    pub fn issue_request(&self, verb: &str, path: &str, element: Option<Element>) -> Promise {
        let verb = verb.to_uppercase();
        let path = path.to_string();
        let element = element.unwrap_or_else(|| {
            web_sys::window().unwrap().document().unwrap().body().unwrap().into()
        });

        let future = async move {
            let xhr = XmlHttpRequest::new().unwrap();
            
            // Set up the request
            xhr.open(&verb, &path).unwrap();
            xhr.set_request_header(&"HX-Request".to_string(), &"true".to_string()).unwrap();
            xhr.set_request_header(&"HX-Current-URL".to_string(), &web_sys::window().unwrap().location().href().unwrap()).unwrap();
            
            if let Some(id) = element.id().as_string() {
                if !id.is_empty() {
                    xhr.set_request_header(&"HX-Trigger".to_string(), &id).unwrap();
                }
            }

            // Create a promise for the XHR response
            let promise = Promise::new(&mut |resolve, reject| {
                let resolve = resolve.clone();
                let reject = reject.clone();
                let xhr_clone = xhr.clone();
                
                let onload = Closure::wrap(Box::new(move || {
                    let response = xhr_clone.response_text().unwrap().unwrap_or_else(|| "".to_string());
                    resolve.call1(&JsValue::null(), &response.into()).unwrap();
                }) as Box<dyn FnMut()>);
                
                let onerror = Closure::wrap(Box::new(move || {
                    reject.call1(&JsValue::null(), &"Request failed".to_string().into()).unwrap();
                }) as Box<dyn FnMut()>);
                
                xhr.set_onload(Some(onload.as_ref().unchecked_ref()));
                xhr.set_onerror(Some(onerror.as_ref().unchecked_ref()));
                
                onload.forget();
                onerror.forget();
            });

            // Send the request
            if verb == "GET".to_string() {
                xhr.send().unwrap();
            } else {
                // For POST/PUT/etc, we might need to send form data
                if let Some(form) = element.closest(&"form".to_string()).unwrap() {
                    if let Some(form_element) = form.dyn_ref::<HtmlFormElement>() {
                        let form_data = FormData::new_with_form(form_element).unwrap();
                        xhr.send_with_opt_form_data(Some(&form_data)).unwrap();
                    } else {
                        xhr.send().unwrap();
                    }
                } else {
                    xhr.send().unwrap();
                }
            }

            promise
        };

        wasm_bindgen_futures::future_to_promise(future)
    }

    pub fn get_headers(&self, element: &Element, target: &Element) -> Object {
        let headers = Object::new();
        
        Reflect::set(&headers, &"HX-Request".to_string().into(), &"true".to_string().into()).unwrap();
        Reflect::set(&headers, &"HX-Current-URL".to_string().into(), 
                    &web_sys::window().unwrap().location().href().unwrap().into()).unwrap();
        
        if let Some(id) = element.id().as_string() {
            if !id.is_empty() {
                Reflect::set(&headers, &"HX-Trigger".to_string().into(), &id.into()).unwrap();
            }
        }
        
        if let Some(name) = element.get_attribute("name") {
            Reflect::set(&headers, &"HX-Trigger-Name".to_string().into(), &name.into()).unwrap();
        }
        
        if let Some(target_id) = target.id().as_string() {
            if !target_id.is_empty() {
                Reflect::set(&headers, &"HX-Target".to_string().into(), &target_id.into()).unwrap();
            }
        }

        headers
    }

    pub fn filter_values(&self, form_data: &FormData, element: &Element) -> FormData {
        // Check for hx-params attribute to filter form data
        if let Some(params_value) = element.get_attribute(&"hx-params".to_string()) {
            match params_value.as_str() {
                "none" => FormData::new().unwrap(),
                "*" => form_data.clone(),
                params if params.starts_with(&"not ".to_string()) => {
                    let filtered = FormData::new().unwrap();
                    // Implementation would filter out specified params
                    filtered
                },
                params => {
                    let filtered = FormData::new().unwrap();
                    // Implementation would include only specified params
                    filtered
                }
            }
        } else {
            form_data.clone()
        }
    }

    pub fn encode_params_for_body(&self, form_data: &FormData, element: &Element) -> Result<JsValue, JsValue> {
        // Check if we should use multipart/form-data
        if self.uses_form_data(element) {
            Ok(form_data.into())
        } else {
            // URL encode the form data
            Ok(self.url_encode(form_data).into())
        }
    }

    fn uses_form_data(&self, element: &Element) -> bool {
        element.get_attribute(&"hx-encoding".to_string()).as_deref() == Some(&"multipart/form-data".to_string()) ||
        (element.tag_name() == "FORM".to_string() && 
         element.get_attribute(&"enctype".to_string()).as_deref() == Some(&"multipart/form-data".to_string()))
    }

    fn url_encode(&self, form_data: &FormData) -> String {
        // Simplified URL encoding - real implementation would iterate over FormData entries
        String::new()
    }

    pub fn handle_response_headers(&self, xhr: &XmlHttpRequest, element: &Element) {
        // Handle HX-Trigger header
        if let Some(trigger_header) = xhr.get_response_header(&"HX-Trigger".to_string()).unwrap() {
            self.handle_trigger_header(&trigger_header, element);
        }
        
        // Handle HX-Redirect header
        if let Some(redirect_url) = xhr.get_response_header(&"HX-Redirect".to_string()).unwrap() {
            web_sys::window().unwrap().location().set_href(&redirect_url).unwrap();
        }
        
        // Handle HX-Refresh header
        if xhr.get_response_header(&"HX-Refresh".to_string()).unwrap().as_deref() == Some(&"true".to_string()) {
            web_sys::window().unwrap().location().reload().unwrap();
        }
    }

    fn handle_trigger_header(&self, trigger_body: &str, element: &Element) {
        if trigger_body.starts_with(&"{".to_string()) {
            // JSON format triggers
            if let Ok(triggers) = js_sys::JSON::parse(trigger_body) {
                let triggers_obj = triggers.dyn_ref::<Object>().unwrap();
                let keys = Object::keys(triggers_obj);
                
                for i in 0..keys.length() {
                    if let Some(event_name) = keys.get(i).as_string() {
                        let detail = Reflect::get(triggers_obj, &event_name.into()).unwrap();
                        
                        let event_init = CustomEventInit::new();
                        event_init.set_detail(&detail);
                        event_init.set_bubbles(true);
                        
                        if let Ok(event) = CustomEvent::new_with_event_init_dict(&event_name, &event_init) {
                            let _ = element.dispatch_event(&event);
                        }
                    }
                }
            }
        } else {
            // Comma-separated event names
            let event_names: Vec<&str> = trigger_body.split(&",".to_string()).collect();
            for event_name in event_names {
                let event_name = event_name.trim();
                if let Ok(event) = CustomEvent::new(event_name) {
                    let _ = element.dispatch_event(&event);
                }
            }
        }
    }
}