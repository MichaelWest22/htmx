<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# i need to explain to a coding AI how the trusted Types api can be used to validate strings as safe for dom insertion with strict CSP policies and how to implement a validator

The **Trusted Types API** provides a programmatic, security-enforced way to validate and transform potentially unsafe strings before inserting them into the DOM, working hand-in-hand with strict Content Security Policy (CSP) settings to prevent DOM-based XSS attacks.[^1][^2][^3][^4]

## How Trusted Types Validates Strings

Trusted Types replaces dangerous DOM sinks (such as `innerHTML`, `eval`, and `script.src`) with a requirement for special objects—**Trusted Types**, not raw strings. This means that any string used for DOM insertion must first pass through a developer-defined **policy** that validates and sanitizes it. The API does not automatically sanitize but requires that developers define how strings are to be transformed or rejected.[^2][^5][^4]

### Key Steps:

- A security policy (a `TrustedTypePolicy` object) is created via `trustedTypes.createPolicy`.
- Each policy specifies transformation functions, such as `createHTML`, that receive the original string and output sanitized, validated content.
- The policy can use any validation logic—typically, libraries like DOMPurify for HTML sanitization.
- Only strings processed by such a policy will be accepted by protected DOM sinks under strict CSP.


## Integrating with a Strict CSP

To force the use of Trusted Types, configure the web application’s CSP header using these directives:[^3][^4][^6]

- `trusted-types <policyName>`: Whitelists allowed policies.
- `require-trusted-types-for 'script'`: Requires trusted types for all risky DOM insertion points (like script elements, HTML content, etc.).

Example CSP header:

```
Content-Security-Policy: trusted-types mypolicy; require-trusted-types-for 'script';
```

With these enabled, any attempt to insert a raw string into a security-sensitive DOM API will fail unless it’s returned by a trusted policy.[^4][^3]

## Example: Implementing a Validator

Here’s a basic implementation using DOMPurify to sanitize HTML:

```javascript
const policy = trustedTypes.createPolicy('my-policy', {
  createHTML: (input) => DOMPurify.sanitize(input)
});
// Now only trusted, sanitized HTML can reach the DOM
const userInput = '<p>Untrusted content</p>';
element.innerHTML = policy.createHTML(userInput);
```

- `trustedTypes.createPolicy` returns an object whose methods (like `createHTML`) will receive the original string, execute validation (here, with DOMPurify), and return a **TrustedHTML** object.
- The DOM will only accept this TrustedHTML object, not a plain string.[^1][^4]


### Writing a Custom Validator

If a custom validator is needed (beyond sanitization), one could write:

```javascript
const policy = trustedTypes.createPolicy('strictPolicy', {
  createHTML: (input) => {
    if (!validate(input)) {
      throw new Error('Input did not pass validation');
    }
    return input; // or DOMPurify.sanitize(input)
  }
});
function validate(str) {
  // Application-specific logic here
  return str.indexOf('<script>') === -1;
}
```

This approach allows for application-specific rules and extensibility as needs change.[^3][^4][^1]

## Summary

- **Trusted Types API** enforces validation and transformation of strings before DOM insertion.
- **Strict CSP** policies (`trusted-types`, `require-trusted-types-for`) ensure only sanitized, policy-approved content reaches security-critical DOM APIs.
- Implement validators within the Trusted Types policy functions, leveraging libraries or custom logic as needed.[^4][^1][^3]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^7][^8][^9]</span>

<div style="text-align: center">⁂</div>

[^1]: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API

[^2]: https://web.dev/articles/trusted-types

[^3]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/trusted-types

[^4]: https://centralcsp.com/docs/trusted-types

[^5]: https://grafana.com/blog/2023/07/11/trusted-types-how-we-mitigate-xss-threats-in-grafana-10/

[^6]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for

[^7]: https://www.w3.org/TR/trusted-types/

[^8]: https://github.com/w3c/webappsec-trusted-types/wiki/FAQ

[^9]: https://portswigger.net/bappstore/1894edb751244e52856efa092d58979d

[^10]: https://developer.chrome.com/docs/lighthouse/best-practices/trusted-types-xss

[^11]: https://yougottahackthat.com/insights/new-burp-extention-trusted-types-checker

[^12]: https://auth0.com/blog/securing-spa-with-trusted-types/

[^13]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

[^14]: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

[^15]: https://web.dev/articles/strict-csp

[^16]: https://dl.acm.org/doi/10.1145/3708821.3733889

[^17]: https://github.com/onetimesecret/onetimesecret/issues/859

[^18]: https://www.usenix.org/system/files/sec24fall-prepub-883-roth.pdf

[^19]: https://developer.chrome.com/blog/csp-issues

[^20]: https://content-security-policy.com/trusted-types/



To scan a codebase for all uses of Trusted Types–unsafe properties, use an AI-assisted static analysis tool or IDE extension that can search for known "sink" functions dangerous to Trusted Types. These are spots where user data can be injected into the DOM in unsafe ways. Below are the main unsafe sink points and brief explanations for each:[1][2][3][4]

## Main Trusted Types–Unsafe Sink Points

- **innerHTML**: Assigning a string directly to `element.innerHTML` allows arbitrary code or markup injection and is a classic XSS vector. Trusted Types require a `TrustedHTML` object instead of normal strings.[2][3][1]
- **outerHTML**: Similar risk to `innerHTML`. Setting `element.outerHTML` replaces the entire element with parsed HTML, so it’s another dangerous injection point.
- **insertAdjacentHTML**: Inserting raw HTML using this method parses and injects markup at the specified position in the DOM, which can lead to XSS.[3]
- **document.write / document.writeln**: Writing untrusted content with these methods injects it directly into the DOM. Trusted Types requires use of safe, trusted HTML.[1][3]
- **Range.createContextualFragment**: Creating a document fragment from a string of HTML can allow code injection without proper Trusted Types.[3]
- **Element.setAttribute (sometimes)**: Particularly for certain attributes like `src`, `href`, `onclick`, etc. May require Trusted Script or Trusted Script URL depending on context.[2][3]
- **eval, setTimeout, setInterval (with string arguments)**: Passing strings to these executes code, requiring TrustedScript if Trusted Types is enabled for script sinks.[3]

## Brief Explanations

- **innerHTML / outerHTML**: Allow direct insertion of untrusted HTML; disable string assignments unless wrapped as TrustedHTML.[2][3]
- **insertAdjacentHTML**: Used for dynamic DOM construction; vulnerable if passed unsanitized data.[3]
- **document.write / writeln**: Legacy methods for direct DOM injection; very dangerous with dynamic input.[1][3]
- **Range.createContextualFragment**: Turns HTML into DOM nodes; requires approval/serialization by Trusted Types policy.[3]
- **Dangerous setAttribute usage**: Attribute injection can lead to DOM-based XSS if not constrained by Trusted Types.[2]
- **String eval/setTimeout/setInterval**: Executing user data as code; Trusted Types tightly restricts with policies for TrustedScript.[3]

## Scanning for Unsafe Properties

- Use an AI-powered code scanning assistant or static analysis plugin (such as Codacy, Snyk, or IDE extensions that support Trusted Types) to automatically enumerate all usages of these sinks in your codebase.[5][6]
- Review flagged locations and refactor each to comply with Trusted Types, typically by wrapping the HTML/script in a policy that sanitizes or validates before assigning.[1][3]

If support for automated refactoring or scanning is needed, investigate open-source security scanning repos such as `repo-unsafe-scanner` on GitHub, or tools built into platforms like Codacy, which can surface these patterns and highlight code to change.[6][5]

## Summary Table of Unsafe Sinks

| Sink Point                  | Required Trusted Type | Example Usage            | Risk Explanation                       |
|-----------------------------|----------------------|--------------------------|----------------------------------------|
| innerHTML                   | TrustedHTML          | el.innerHTML = x         | Arbitrary HTML/JS injection[3]    |
| outerHTML                   | TrustedHTML          | el.outerHTML = x         | Arbitrary HTML/JS injection[2]     |
| insertAdjacentHTML          | TrustedHTML          | el.insertAdjacentHTML()  | Injects untrusted HTML[3]         |
| document.write/writeln      | TrustedHTML          | document.write(x)        | Direct DOM injection[1]            |
| Range.createContextualFragment | TrustedHTML      | range.createContextualFragment(x) | Untrusted fragment[3]  |
| setAttribute (src/href/...) | TrustedScriptURL/TrustedURL/TrustedScript | el.setAttribute('src', x) | Can inject JS/URLs/scripts[2]      |
| eval, setTimeout, setInterval (string) | TrustedScript | eval(x), setTimeout(x)    | Runs arbitrary code[3]            |

Each flagged use must be reviewed and replaced by a policy-backed Trusted Type assignment to meet Trusted Types support. This reduces XSS risk throughout the app.[4][2][3]

[1](https://auth0.com/blog/securing-spa-with-trusted-types/)
[2](https://content-security-policy.com/require-trusted-types-for/)
[3](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
[4](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for)
[5](https://github.com/flaryx32/repo-unsafe-scanner)
[6](https://blog.codacy.com/how-to-keep-your-ai-generated-code-secure)
[7](https://www.stackhawk.com/blog/4-best-practices-for-ai-code-security-a-developers-guide/)
[8](https://graphite.dev/guides/privacy-security-ai-coding-tools)
[9](https://blog.codacy.com/using-ai-to-normalize-and-improve-scan-rule-documentation-at-codacy)
[10](https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions)
[11](https://securecode.wiki/docs/lang/javascript/)
[12](https://github.com/w3c/webappsec-trusted-types/wiki/FAQ)
[13](https://learn.microsoft.com/en-us/azure/ai-foundry/ai-services/content-safety-overview)
[14](https://www.w3.org/TR/trusted-types/)
[15](https://eitca.org/cybersecurity/eitc-is-wasf-web-applications-security-fundamentals/practical-web-applications-security/securing-web-applications-with-modern-platform-features/examination-review-securing-web-applications-with-modern-platform-features/what-is-the-process-for-creating-a-trusted-types-object-using-the-trusted-types-api/)
[16](https://www.sciencedirect.com/science/article/pii/S0950584924001770)
[17](https://bughunters.google.com/blog/5850786553528320/a-deep-dive-into-js-trusted-types-violations)
[18](https://www.youtube.com/watch?v=IeKLIwJ2ZMY)
[19](https://www.securityjourney.com/post/how-to-choose-the-right-ai-coding-assistant-without-sacrificing-security)
[20](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)


To scan a codebase for all uses of Trusted Types–unsafe properties, use an AI-assisted static analysis tool or IDE extension that can search for known "sink" functions dangerous to Trusted Types. These are spots where user data can be injected into the DOM in unsafe ways. Below are the main unsafe sink points and brief explanations for each:[1][2][3][4]

## Main Trusted Types–Unsafe Sink Points

- **innerHTML**: Assigning a string directly to `element.innerHTML` allows arbitrary code or markup injection and is a classic XSS vector. Trusted Types require a `TrustedHTML` object instead of normal strings.[2][3][1]
- **outerHTML**: Similar risk to `innerHTML`. Setting `element.outerHTML` replaces the entire element with parsed HTML, so it’s another dangerous injection point.
- **insertAdjacentHTML**: Inserting raw HTML using this method parses and injects markup at the specified position in the DOM, which can lead to XSS.[3]
- **document.write / document.writeln**: Writing untrusted content with these methods injects it directly into the DOM. Trusted Types requires use of safe, trusted HTML.[1][3]
- **Range.createContextualFragment**: Creating a document fragment from a string of HTML can allow code injection without proper Trusted Types.[3]
- **Element.setAttribute (sometimes)**: Particularly for certain attributes like `src`, `href`, `onclick`, etc. May require Trusted Script or Trusted Script URL depending on context.[2][3]
- **eval, setTimeout, setInterval (with string arguments)**: Passing strings to these executes code, requiring TrustedScript if Trusted Types is enabled for script sinks.[3]

## Brief Explanations

- **innerHTML / outerHTML**: Allow direct insertion of untrusted HTML; disable string assignments unless wrapped as TrustedHTML.[2][3]
- **insertAdjacentHTML**: Used for dynamic DOM construction; vulnerable if passed unsanitized data.[3]
- **document.write / writeln**: Legacy methods for direct DOM injection; very dangerous with dynamic input.[1][3]
- **Range.createContextualFragment**: Turns HTML into DOM nodes; requires approval/serialization by Trusted Types policy.[3]
- **Dangerous setAttribute usage**: Attribute injection can lead to DOM-based XSS if not constrained by Trusted Types.[2]
- **String eval/setTimeout/setInterval**: Executing user data as code; Trusted Types tightly restricts with policies for TrustedScript.[3]

## Scanning for Unsafe Properties

- Use an AI-powered code scanning assistant or static analysis plugin (such as Codacy, Snyk, or IDE extensions that support Trusted Types) to automatically enumerate all usages of these sinks in your codebase.[5][6]
- Review flagged locations and refactor each to comply with Trusted Types, typically by wrapping the HTML/script in a policy that sanitizes or validates before assigning.[1][3]

If support for automated refactoring or scanning is needed, investigate open-source security scanning repos such as `repo-unsafe-scanner` on GitHub, or tools built into platforms like Codacy, which can surface these patterns and highlight code to change.[6][5]

## Summary Table of Unsafe Sinks

| Sink Point                  | Required Trusted Type | Example Usage            | Risk Explanation                       |
|-----------------------------|----------------------|--------------------------|----------------------------------------|
| innerHTML                   | TrustedHTML          | el.innerHTML = x         | Arbitrary HTML/JS injection[3]    |
| outerHTML                   | TrustedHTML          | el.outerHTML = x         | Arbitrary HTML/JS injection[2]     |
| insertAdjacentHTML          | TrustedHTML          | el.insertAdjacentHTML()  | Injects untrusted HTML[3]         |
| document.write/writeln      | TrustedHTML          | document.write(x)        | Direct DOM injection[1]            |
| Range.createContextualFragment | TrustedHTML      | range.createContextualFragment(x) | Untrusted fragment[3]  |
| setAttribute (src/href/...) | TrustedScriptURL/TrustedURL/TrustedScript | el.setAttribute('src', x) | Can inject JS/URLs/scripts[2]      |
| eval, setTimeout, setInterval (string) | TrustedScript | eval(x), setTimeout(x)    | Runs arbitrary code[3]            |

Each flagged use must be reviewed and replaced by a policy-backed Trusted Type assignment to meet Trusted Types support. This reduces XSS risk throughout the app.[4][2][3]

[1](https://auth0.com/blog/securing-spa-with-trusted-types/)
[2](https://content-security-policy.com/require-trusted-types-for/)
[3](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
[4](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for)
[5](https://github.com/flaryx32/repo-unsafe-scanner)
[6](https://blog.codacy.com/how-to-keep-your-ai-generated-code-secure)
[7](https://www.stackhawk.com/blog/4-best-practices-for-ai-code-security-a-developers-guide/)
[8](https://graphite.dev/guides/privacy-security-ai-coding-tools)
[9](https://blog.codacy.com/using-ai-to-normalize-and-improve-scan-rule-documentation-at-codacy)
[10](https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions)
[11](https://securecode.wiki/docs/lang/javascript/)
[12](https://github.com/w3c/webappsec-trusted-types/wiki/FAQ)
[13](https://learn.microsoft.com/en-us/azure/ai-foundry/ai-services/content-safety-overview)
[14](https://www.w3.org/TR/trusted-types/)
[15](https://eitca.org/cybersecurity/eitc-is-wasf-web-applications-security-fundamentals/practical-web-applications-security/securing-web-applications-with-modern-platform-features/examination-review-securing-web-applications-with-modern-platform-features/what-is-the-process-for-creating-a-trusted-types-object-using-the-trusted-types-api/)
[16](https://www.sciencedirect.com/science/article/pii/S0950584924001770)
[17](https://bughunters.google.com/blog/5850786553528320/a-deep-dive-into-js-trusted-types-violations)
[18](https://www.youtube.com/watch?v=IeKLIwJ2ZMY)
[19](https://www.securityjourney.com/post/how-to-choose-the-right-ai-coding-assistant-without-sacrificing-security)
[20](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)