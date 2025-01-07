"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkResolver = exports.LinkResolveErrorCodes = exports.acceptLanguage = exports.accept = exports.userAgent = void 0;
exports.isLinkResolveError = isLinkResolveError;
const jsdom_1 = require("jsdom");
const node_url_1 = require("node:url");
const utils_1 = require("./utils");
exports.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
exports.accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
exports.acceptLanguage = 'zh-CN,zh;q=0.9';
var LinkResolveErrorCodes;
(function (LinkResolveErrorCodes) {
    LinkResolveErrorCodes[LinkResolveErrorCodes["MISSING_CONTENT_LENGTH"] = -4] = "MISSING_CONTENT_LENGTH";
    LinkResolveErrorCodes[LinkResolveErrorCodes["URL_OF_AJAXM_PHP_RESPONSE_NOT_REDIRECTED"] = -3] = "URL_OF_AJAXM_PHP_RESPONSE_NOT_REDIRECTED";
    LinkResolveErrorCodes[LinkResolveErrorCodes["WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED"] = -2] = "WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED";
    LinkResolveErrorCodes[LinkResolveErrorCodes["UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION"] = -1] = "UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION";
    LinkResolveErrorCodes[LinkResolveErrorCodes["PASSWORD_REQUIRED"] = 1] = "PASSWORD_REQUIRED";
    LinkResolveErrorCodes[LinkResolveErrorCodes["PASSWORD_INCORRECT"] = 2] = "PASSWORD_INCORRECT";
    LinkResolveErrorCodes[LinkResolveErrorCodes["UNKNOWN_PAGE_CLOSURE_REASON"] = 3] = "UNKNOWN_PAGE_CLOSURE_REASON";
    LinkResolveErrorCodes[LinkResolveErrorCodes["FILE_UNSHARED"] = 3.1] = "FILE_UNSHARED";
})(LinkResolveErrorCodes || (exports.LinkResolveErrorCodes = LinkResolveErrorCodes = {}));
class LinkResolver {
    constructor(options) {
        Object.setPrototypeOf(options, null);
        if (typeof options.url === 'string') {
            options.url = new node_url_1.URL(options.url);
        }
        options.redirectedURL ?? (options.redirectedURL = true);
        this.options = Object.freeze(options);
    }
    async resolve() {
        const pageURL = new node_url_1.URL(this.options.url.pathname, 'https://www.lanzoup.com');
        const result = {
            downURL: new node_url_1.URL('http://example.org'),
            filename: '',
            filesize: 0
        };
        Object.setPrototypeOf(result, null);
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
        this.document = new jsdom_1.JSDOM(html).window.document;
        // 页面关闭处理
        const pageOffElement = this.document.querySelector('.off');
        if (pageOffElement) {
            const msg = pageOffElement.lastChild.textContent;
            if (msg.includes('文件取消分享')) {
                throw new utils_1.LinkResolveError('File unshared', LinkResolveErrorCodes.FILE_UNSHARED, msg);
            }
            else {
                throw new utils_1.LinkResolveError('Unknown page closure reason', LinkResolveErrorCodes.UNKNOWN_PAGE_CLOSURE_REASON, msg);
            }
        }
        const hasPassword = Boolean(this.document.querySelector('#pwd'));
        /*
        const filenameFromTitle = hasPassword
            ? this.document.title
            : this.document.title.slice(0, -6);
        */
        // const filesizeFromMetaDescription = (this.window.document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content?.slice?.(5);
        if (hasPassword) {
            if ((0, utils_1.isEmpty)(this.options.password)) {
                throw new utils_1.LinkResolveError('Password required', LinkResolveErrorCodes.PASSWORD_REQUIRED);
            }
            const resp = await (await fetch(`https://www.lanzoup.com/ajaxm.php${html.match(/'*ajaxm.php(.*?)'/)[1]}`, {
                headers: (0, utils_1.getAjaxmPHPHeaders)(pageURL),
                body: (0, utils_1.createAjaxmPHPBody)({
                    action: 'downprocess',
                    sign: html.match(/skdklds = '(.*?)'/)[1],
                    p: this.options.password,
                    kd: html.match(/kdns =(.*?)/)?.[1] ?? 0
                }),
                method: 'POST'
            })).json();
            if (resp.zt) {
                result.downURL = new node_url_1.URL('/file/' + resp.url, resp.dom);
                result.filename = resp.inf;
                const moreInfo = await (0, utils_1.getMoreInfoFromAjaxmPHPResponseURL)(result.downURL);
                result.filesize = moreInfo.length;
                if (this.options.redirectedURL) {
                    result.downURL = moreInfo.redirectedURL;
                }
            }
            else {
                if (resp.inf === '密码不正确') {
                    throw new utils_1.LinkResolveError('Password incorrect', LinkResolveErrorCodes.PASSWORD_INCORRECT);
                }
                else {
                    throw new utils_1.LinkResolveError('Unknown ajaxm.php response exception', LinkResolveErrorCodes.UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION, resp);
                }
            }
        }
        else {
            if (!(0, utils_1.isEmpty)(this.options.password)) {
                console.warn('Password not needs');
            }
            const iframeURL = new node_url_1.URL(this.document.querySelector('.ifr2').src, pageURL.origin);
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
            // this.iframeDocument = new JSDOM(iframeHTML).window.document;
            const resp = await (await fetch(`https://www.lanzoup.com/ajaxm.php${iframeHTML.match(/'*ajaxm.php(.*?)'/)[1]}`, {
                headers: (0, utils_1.getAjaxmPHPHeaders)(iframeURL),
                body: (0, utils_1.createAjaxmPHPBody)({
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
                // result.filename = filenameFromTitle;
                const moreInfo = await (0, utils_1.getMoreInfoFromAjaxmPHPResponseURL)(result.downURL);
                result.filesize = moreInfo.length;
                result.filename = moreInfo.filename;
                if (this.options.redirectedURL) {
                    result.downURL = moreInfo.redirectedURL;
                }
            }
            else {
                throw new utils_1.LinkResolveError('Unknown ajaxm.php response exception', LinkResolveErrorCodes.UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION, resp);
            }
        }
        return result;
    }
}
exports.LinkResolver = LinkResolver;
function isLinkResolveError(val) {
    return val instanceof utils_1.LinkResolveError;
}
