import htmx from 'htmx.org';

// Config
const version: string = htmx.config.version;
const timeout: number = htmx.config.defaultTimeout;
const logAll: boolean = htmx.config.logAll;
const prefix: string = htmx.config.prefix;
const transitions: boolean = htmx.config.transitions;
const history: boolean = htmx.config.history;
const historyReload: boolean = htmx.config.historyReload;
const mode: 'same-origin' | 'cors' | 'no-cors' = htmx.config.mode;
const defaultSwap: string = htmx.config.defaultSwap;
const indicatorClass: string = htmx.config.indicatorClass;
const requestClass: string = htmx.config.requestClass;
const includeIndicatorCSS: boolean = htmx.config.includeIndicatorCSS;
const defaultTimeout2: number = htmx.config.defaultTimeout;
const inlineScriptNonce: string = htmx.config.inlineScriptNonce;
const inlineStyleNonce: string = htmx.config.inlineStyleNonce;
const extensions: string = htmx.config.extensions;
const morphIgnore: string[] = htmx.config.morphIgnore;
const noSwap: number[] = htmx.config.noSwap;
const implicitInheritance: boolean = htmx.config.implicitInheritance;

// Core methods
htmx.ajax('GET', '/test');
htmx.ajax('POST', '/test', { target: '#result' });

const el: Element | null = htmx.find('#test');
const el2: Element | null = htmx.find(document.body, '#test');
const els: Element[] = htmx.findAll('div');
const els2: Element[] = htmx.findAll(document.body, 'div');

htmx.on('htmx:after:swap', (evt: Event) => {});
htmx.on('#btn', 'click', (evt: Event) => {});

htmx.onLoad((elt: Element) => {});

htmx.process(document.body);

const registered: boolean = htmx.registerExtension('test', {
  init: (api: any) => {},
  htmx_before_request: (elt: Element, detail: any) => {}
});

const triggered: boolean = htmx.trigger('#btn', 'click', { detail: 'test' });

const interval: number = htmx.parseInterval('1s');

const promise1: Promise<void> = htmx.timeout(1000);
const promise2: Promise<Event | null> = htmx.forEvent('htmx:after:swap', 5000);

htmx.swap('#target', '<div>content</div>', { swapStyle: 'innerHTML' });

htmx.takeClass(document.body, 'active');
htmx.takeClass(document.body, 'active', document.querySelector('#container') || document.body);

export default htmx;
