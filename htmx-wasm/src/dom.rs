use wasm_bindgen::prelude::*;
use web_sys::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct DomUtils;

#[wasm_bindgen]
impl DomUtils {
    #[wasm_bindgen(constructor)]
    pub fn new() -> DomUtils {
        DomUtils
    }

    pub fn find(&self, selector: &str) -> Option<Element> {
        let document = web_sys::window()?.document()?;
        document.query_selector(&selector.to_string()).ok()?
    }

    pub fn find_all(&self, selector: &str) -> NodeList {
        let document = web_sys::window().unwrap().document().unwrap();
        document.query_selector_all(&selector.to_string()).unwrap()
    }

    pub fn closest(&self, element: &Element, selector: &str) -> Option<Element> {
        element.closest(&selector.to_string()).ok()?
    }

    pub fn matches(&self, element: &Element, selector: &str) -> bool {
        element.matches(&selector.to_string()).unwrap_or(false)
    }

    pub fn get_attribute_value(&self, element: &Element, attr_name: &str) -> Option<String> {
        // Check both regular and data- prefixed versions
        element.get_attribute(&attr_name.to_string())
            .or_else(|| element.get_attribute(&("data-".to_string() + attr_name)))
    }

    pub fn has_attribute(&self, element: &Element, attr_name: &str) -> bool {
        element.has_attribute(&attr_name.to_string()) || 
        element.has_attribute(&("data-".to_string() + attr_name))
    }

    pub fn add_class(&self, element: &Element, class_name: &str) {
        if let Some(class_list) = element.class_list().ok() {
            let _ = class_list.add_1(&class_name.to_string());
        }
    }

    pub fn remove_class(&self, element: &Element, class_name: &str) {
        if let Some(class_list) = element.class_list().ok() {
            let _ = class_list.remove_1(&class_name.to_string());
        }
    }

    pub fn toggle_class(&self, element: &Element, class_name: &str) {
        if let Some(class_list) = element.class_list().ok() {
            let _ = class_list.toggle(&class_name.to_string());
        }
    }

    pub fn remove_element(&self, element: &Element) {
        if let Some(parent) = element.parent_element() {
            let _ = parent.remove_child(element);
        }
    }

    pub fn get_target(&self, element: &Element) -> Element {
        if let Some(target_selector) = self.get_attribute_value(element, &"hx-target".to_string()) {
            if target_selector == "this".to_string() {
                return element.clone();
            }
            if let Some(target) = self.find(&target_selector) {
                return target;
            }
        }
        element.clone()
    }

    pub fn body_contains(&self, element: &Element) -> bool {
        let document = web_sys::window().unwrap().document().unwrap();
        if let Some(body) = document.body() {
            body.contains(Some(element))
        } else {
            false
        }
    }

    pub fn parse_html(&self, html: &str) -> Result<DocumentFragment, JsValue> {
        let document = web_sys::window().unwrap().document().unwrap();
        let template = document.create_element(&"template".to_string())?;
        template.set_inner_html(html);
        
        let template_element = template.dyn_ref::<HtmlTemplateElement>().unwrap();
        Ok(template_element.content())
    }

    pub fn get_form_data(&self, form: &HtmlFormElement) -> FormData {
        FormData::new_with_form(form).unwrap()
    }

    pub fn serialize_form_data(&self, form_data: &FormData) -> String {
        let mut params = Vec::new();
        
        // Note: This is a simplified version - real implementation would iterate over FormData
        // For now, return empty string as placeholder
        params.join(&"&".to_string())
    }
}