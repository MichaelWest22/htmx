export default htmx;
export type HttpVerb = "get" | "head" | "post" | "put" | "delete" | "connect" | "options" | "trace" | "patch";
export type SwapOptions = {
    select?: string;
    selectOOB?: string;
    eventInfo?: any;
    anchor?: string;
    contextElement?: Element;
    afterSwapCallback?: swapCallback;
    afterSettleCallback?: swapCallback;
    beforeSwapCallback?: swapCallback;
    title?: string;
    historyRequest?: boolean;
};
export type swapCallback = () => any;
export type HtmxSwapStyle = "innerHTML" | "outerHTML" | "beforebegin" | "afterbegin" | "beforeend" | "afterend" | "delete" | "none" | string;
export type HtmxSwapSpecification = {
    swapStyle: HtmxSwapStyle;
    swapDelay: number;
    settleDelay: number;
    transition?: boolean;
    ignoreTitle?: boolean;
    head?: string;
    scroll?: "top" | "bottom" | number;
    scrollTarget?: string;
    show?: string;
    showTarget?: string;
    focusScroll?: boolean;
};
export type ConditionalFunction = ((this: Node, evt: Event) => boolean) & {
    source: string;
};
export type HtmxTriggerSpecification = {
    trigger: string;
    pollInterval?: number;
    eventFilter?: ConditionalFunction;
    changed?: boolean;
    once?: boolean;
    consume?: boolean;
    delay?: number;
    from?: string;
    target?: string;
    throttle?: number;
    queue?: string;
    root?: string;
    threshold?: string;
};
export type HtmxElementValidationError = {
    elt: Element;
    message: string;
    validity: ValidityState;
};
export type HtmxHeaderSpecification = Record<string, string>;
export type HtmxAjaxHelperContext = {
    source?: Element | string;
    event?: Event;
    handler?: HtmxAjaxHandler;
    target?: Element | string;
    swap?: HtmxSwapStyle;
    values?: any | FormData;
    headers?: Record<string, string>;
    select?: string;
};
export type HtmxRequestConfig = {
    boosted: boolean;
    useUrlParams: boolean;
    formData: FormData;
    /**
     * formData proxy
     */
    parameters: any;
    unfilteredFormData: FormData;
    /**
     * unfilteredFormData proxy
     */
    unfilteredParameters: any;
    headers: HtmxHeaderSpecification;
    elt: Element;
    target: Element;
    verb: HttpVerb;
    errors: HtmxElementValidationError[];
    withCredentials: boolean;
    timeout: number;
    path: string;
    triggeringEvent: Event;
};
export type HtmxResponseInfo = {
    xhr: XMLHttpRequest;
    target: Element;
    requestConfig: HtmxRequestConfig;
    etc: HtmxAjaxEtc;
    boosted: boolean;
    select: string;
    pathInfo: {
        requestPath: string;
        finalRequestPath: string;
        responsePath: string | null;
        anchor: string;
    };
    failed?: boolean;
    successful?: boolean;
    keepIndicators?: boolean;
};
export type HtmxAjaxEtc = {
    returnPromise?: boolean;
    handler?: HtmxAjaxHandler;
    select?: string;
    targetOverride?: Element;
    swapOverride?: HtmxSwapStyle;
    headers?: Record<string, string>;
    values?: any | FormData;
    credentials?: boolean;
    timeout?: number;
};
export type HtmxResponseHandlingConfig = {
    code?: string;
    swap: boolean;
    error?: boolean;
    ignoreTitle?: boolean;
    select?: string;
    target?: string;
    swapOverride?: string;
    event?: string;
};
export type HtmxBeforeSwapDetails = HtmxResponseInfo & {
    shouldSwap: boolean;
    serverResponse: any;
    isError: boolean;
    ignoreTitle: boolean;
    selectOverride: string;
    swapOverride: string;
};
export type HtmxAjaxHandler = (elt: Element, responseInfo: HtmxResponseInfo) => any;
export type HtmxSettleTask = (() => void);
export type HtmxSettleInfo = {
    tasks: HtmxSettleTask[];
    elts: Element[];
    title?: string;
};
export type HtmxExtension = {
    init: (api: any) => void;
    onEvent: (name: string, event: CustomEvent) => boolean;
    transformResponse: (text: string, xhr: XMLHttpRequest, elt: Element) => string;
    isInlineSwap: (swapStyle: HtmxSwapStyle) => boolean;
    handleSwap: (swapStyle: HtmxSwapStyle, target: Node, fragment: Node, settleInfo: HtmxSettleInfo) => boolean | Node[];
    encodeParameters: (xhr: XMLHttpRequest, parameters: FormData, elt: Node) => any | string | null;
    getSelectors: () => string[] | null;
};
interface HTMX {
    onLoad: (callback: (elt: Node) => void) => EventListener;
    process: (elt: Element | string) => void;
    on: (arg1: EventTarget | string, arg2: string | EventListener, arg3?: EventListener | any | boolean, arg4?: any | boolean) => EventListener;
    off: (arg1: EventTarget | string, arg2: string | EventListener, arg3?: EventListener) => EventListener;
    trigger: (elt: EventTarget | string, eventName: string, detail?: any | undefined) => boolean;
    ajax: (verb: HttpVerb, path: string, context: Element | string | HtmxAjaxHelperContext) => Promise<void>;
    find: (eltOrSelector: ParentNode | string, selector?: string) => Element | null;
    findAll: (eltOrSelector: ParentNode | string, selector?: string) => NodeListOf<Element>;
    closest: (elt: Element | string, selector: string) => Element | null;
    values(elt: Element, type: HttpVerb): any;
    remove: (elt: Node, delay?: number) => void;
    addClass: (elt: Element | string, clazz: string, delay?: number) => void;
    removeClass: (node: Node | string, clazz: string, delay?: number) => void;
    toggleClass: (elt: Element | string, clazz: string) => void;
    takeClass: (elt: Node | string, clazz: string) => void;
    swap: (target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions) => void;
    defineExtension: (name: string, extension: Partial<HtmxExtension>) => void;
    removeExtension: (name: string) => void;
    logAll: () => void;
    logNone: () => void;
    logger: any;
    config: {
        historyEnabled: boolean;
        historyCacheSize: number;
        refreshOnHistoryMiss: boolean;
        defaultSwapStyle: HtmxSwapStyle;
        defaultSwapDelay: number;
        defaultSettleDelay: number;
        includeIndicatorStyles: boolean;
        indicatorClass: string;
        requestClass: string;
        addedClass: string;
        settlingClass: string;
        swappingClass: string;
        allowEval: boolean;
        allowScriptTags: boolean;
        inlineScriptNonce: string;
        inlineStyleNonce: string;
        attributesToSettle: string[];
        withCredentials: boolean;
        timeout: number;
        wsReconnectDelay: "full-jitter" | ((retryCount: number) => number);
        wsBinaryType: BinaryType;
        disableSelector: string;
        scrollBehavior: "auto" | "instant" | "smooth";
        defaultFocusScroll: boolean;
        getCacheBusterParam: boolean;
        globalViewTransitions: boolean;
        methodsThatUseUrlParams: (HttpVerb)[];
        selfRequestsOnly: boolean;
        ignoreTitle: boolean;
        scrollIntoViewOnBoost: boolean;
        triggerSpecsCache: any | null;
        disableInheritance: boolean;
        responseHandling: HtmxResponseHandlingConfig[];
        allowNestedOobSwaps: boolean;
        historyRestoreAsHxRequest: boolean;
        reportValidityOfForms: boolean;
    }
    parseInterval: (str: string) => number | undefined;
    location: Location;
    _: (str: string) => any;
    version: string;
}
declare const htmx: HTMX;
