"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkResolver = exports.LanzouStringTransmissionFormat = exports.LinkResolveErrorCodes = exports.acceptLanguage = exports.accept = exports.userAgent = void 0;
exports.getBytesFromFilesizeString = getBytesFromFilesizeString;
const jsdom_1 = require("jsdom");
const node_url_1 = require("node:url");
exports.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
exports.accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
exports.acceptLanguage = 'zh-CN,zh;q=0.9';
function isEmpty(val) {
    return val === '' || val === null || val === undefined || Object.keys(val).length === 0;
}
class LinkResolveError extends Error {
    constructor(message, code, data) {
        super(message);
        this.code = code;
        this.data = data;
    }
}
var LinkResolveErrorCodes;
(function (LinkResolveErrorCodes) {
    LinkResolveErrorCodes[LinkResolveErrorCodes["WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED"] = -2] = "WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED";
    LinkResolveErrorCodes[LinkResolveErrorCodes["UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION"] = -1] = "UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION";
    LinkResolveErrorCodes[LinkResolveErrorCodes["PASSWORD_REQUIRED"] = 1] = "PASSWORD_REQUIRED";
    LinkResolveErrorCodes[LinkResolveErrorCodes["PASSWORD_INCORRECT"] = 2] = "PASSWORD_INCORRECT";
    LinkResolveErrorCodes[LinkResolveErrorCodes["UNKNOWN_PAGE_CLOSURE_REASON"] = 3] = "UNKNOWN_PAGE_CLOSURE_REASON";
    LinkResolveErrorCodes[LinkResolveErrorCodes["FILE_UNSHARED"] = 3.1] = "FILE_UNSHARED";
})(LinkResolveErrorCodes || (exports.LinkResolveErrorCodes = LinkResolveErrorCodes = {}));
function getBytesFromFilesizeString(filesize) {
    filesize = filesize.replace(/\s+/g, '');
    const num = parseFloat(filesize.slice(0, -1));
    const unit = filesize.slice(-1).toUpperCase();
    switch (unit) {
        case 'B': return Math.floor(num);
        case 'K': return Math.floor(num * 1024);
        case 'M': return Math.floor(num * 1024 * 1024);
        case 'G': return Math.floor(num * 1024 * 1024 * 1024);
        case 'T': return Math.floor(num * 1024 * 1024 * 1024 * 1024);
        default: throw new TypeError('你确定蓝奏云能存这么大文件?');
    }
}
class LanzouStringTransmissionFormat {
    constructor() {
        throw new TypeError('你构造一个这玩意干嘛');
    }
    static isValid(str) {
        if (str === '')
            return false;
        const pairs = str.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (!key || !value)
                return false;
        }
        return true;
    }
    static parse(str) {
        if (!this.isValid(str)) {
            throw new TypeError('Invalid string');
        }
        const obj = {};
        str.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            obj[key] = Number.isNaN(Number(value)) ? value : Number(value);
        });
        return obj;
    }
    static stringify(obj) {
        return Object.keys(obj)
            .map(key => `${key}=${obj[key]}`)
            .join('&');
    }
}
exports.LanzouStringTransmissionFormat = LanzouStringTransmissionFormat;
function getAjaxmPHPHeaders(referer) {
    return {
        "content-type": 'application/x-www-form-urlencoded',
        referer: referer.toString(),
        origin: referer.origin,
        "x-requested-with": 'XMLHttpRequest',
        connection: 'keep-alive'
    };
}
function createAjaxmPHPBody(body) {
    try {
        return LanzouStringTransmissionFormat.stringify(body);
    }
    catch (e) {
        throw new LinkResolveError('LanzouStringTransmissionFormat.stringify failed', LinkResolveErrorCodes.WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED, e);
    }
}
class LinkResolver {
    constructor(options) {
        Object.setPrototypeOf(options, null);
        if (typeof options.url === 'string') {
            options.url = new node_url_1.URL(options.url);
        }
        this.options = Object.freeze(options);
    }
    async resolve() {
        const pageURL = new node_url_1.URL(this.options.url.pathname, 'https://www.lanzoup.com');
        const result = {
            downURL: new node_url_1.URL('http://example.org'),
            filename: '',
            filesize: 0
        };
        const html = await (await fetch(pageURL, {
            headers: {
                accept: exports.accept,
                "accept-language": exports.acceptLanguage,
                "accept-encoding": 'gzip, deflate',
                "user-agent": exports.userAgent,
                connection: 'keep-alive'
            },
            method: 'GET',
        })).text();
        this.window = new jsdom_1.JSDOM(html).window;
        // 页面关闭处理
        const pageOffElement = this.window.document.querySelector('.off');
        if (pageOffElement) {
            const msg = pageOffElement.lastChild.textContent;
            if (msg.includes('文件取消分享')) {
                throw new LinkResolveError('File unshared', LinkResolveErrorCodes.FILE_UNSHARED, msg);
            }
            else {
                throw new LinkResolveError('Unknown page closure reason', LinkResolveErrorCodes.UNKNOWN_PAGE_CLOSURE_REASON, msg);
            }
        }
        // const filenameFromTitle = this.window.document.title.slice(0, -6);
        const filesizeFromMetaDescription = this.window.document.querySelector('meta[name="description"]')?.content?.slice?.(5);
        if (this.window.document.querySelector('#pwd')) {
            if (isEmpty(this.options.password)) {
                throw new LinkResolveError('Password required', LinkResolveErrorCodes.PASSWORD_REQUIRED);
            }
            result.filesize = getBytesFromFilesizeString(this.window.document.querySelector('.n_filesize')?.textContent?.slice?.(3)
                ?? filesizeFromMetaDescription);
            const resp = await (await fetch(`https://www.lanzoup.com/ajaxm.php${html.match(/'*ajaxm.php(.*?)'/)[1]}`, {
                headers: getAjaxmPHPHeaders(pageURL),
                body: createAjaxmPHPBody({
                    action: 'downprocess',
                    sign: html.match(/skdklds = '(.*?)'/)[1],
                    p: this.options.password,
                    kd: html.match(/kdns =(.*?)/)[1] ?? 0
                }),
                method: 'POST'
            })).json();
            if (resp.zt) {
                result.downURL = new node_url_1.URL('/file/' + resp.url, resp.dom);
                result.filename = resp.inf;
            }
            else {
                if (resp.inf === '密码不正确') {
                    throw new LinkResolveError('Password incorrect', LinkResolveErrorCodes.PASSWORD_INCORRECT);
                }
                else {
                    throw new LinkResolveError('Unknown ajaxm.php response exception', LinkResolveErrorCodes.UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION, resp);
                }
            }
        }
        else {
            if (!isEmpty(this.options.password)) {
                console.warn('Password not needs');
            }
            const iframeURL = new node_url_1.URL(this.window.document.querySelector('.ifr2').src, pageURL.origin);
            const iframeHTML = await (await fetch(iframeURL, {
                headers: {
                    accept: exports.accept,
                    "accept-language": exports.acceptLanguage,
                    "accept-encoding": 'gzip, deflate',
                    "user-agent": exports.userAgent,
                    connection: 'keep-alive'
                },
                method: 'GET'
            })).text();
            this.iframeWindow = new jsdom_1.JSDOM(iframeHTML).window;
            const resp = await (await fetch(`https://www.lanzoup.com/ajaxm.php${iframeHTML.match(/'*ajaxm.php(.*?)'/)[1]}`, {
                headers: getAjaxmPHPHeaders(iframeURL),
                body: createAjaxmPHPBody({
                    action: 'downprocess',
                    signs: iframeHTML.match(/ajaxdata = '(.*?)'/)[1],
                    sign: iframeHTML.match(/'sign':'(.*?)'/)[1],
                    websign: iframeHTML.match(/ciucjdsdc = '(.*?)'/)[1],
                    websignkey: iframeHTML.match(/aihidcms = '(.*?)'/)[1],
                    ves: iframeHTML.match(/'ves':(.*?),/)[1],
                    kd: iframeHTML.match(/kdns =(.*?)/)?.[1] ?? 0
                }),
                method: 'POST'
            })).json();
            if (resp.zt) {
                result.downURL = new node_url_1.URL('/file/' + resp.url, resp.dom);
                result.filename = resp.inf;
            }
            else {
                throw new LinkResolveError('Unknown ajaxm.php response exception', LinkResolveErrorCodes.UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION, resp);
            }
        }
        return result;
    }
}
exports.LinkResolver = LinkResolver;
