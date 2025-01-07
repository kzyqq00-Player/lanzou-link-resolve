import * as types from 'lanzou-link-resolve';
import {DOMWindow, JSDOM} from 'jsdom';
import {URL} from 'node:url';

export const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
export const accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
export const acceptLanguage = 'zh-CN,zh;q=0.9';

function isEmpty(val: any) {
    return val === '' || val === null || val === undefined || Object.keys(val).length === 0 ;
}

class LinkResolveError extends Error {
    constructor(message?: string, code?: LinkResolveErrorCodes, data?: any) {
        super(message);
        this.code = code;
        this.data = data;
    }

    public data?: any;
    public code?: number;
}

export enum LinkResolveErrorCodes {
    MISSING_CONTENT_LENGTH = -4,
    URL_OF_AJAXM_PHP_RESPONSE_NOT_REDIRECTED = -3,
    WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED = -2,
    UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION = -1,
    PASSWORD_REQUIRED = 1,
    PASSWORD_INCORRECT = 2,
    UNKNOWN_PAGE_CLOSURE_REASON = 3,
    FILE_UNSHARED = 3.1,
}

async function getFilesizeAndRedirectedURLFromAjaxmPHPResponseURL(ajaxmPHPResponseURL: URL) {
    let redirectedURL: URL;
    return await fetch(ajaxmPHPResponseURL, {
        headers: {
            'user-agent': userAgent,
            accept,
            'accept-encoding': 'gzip',
            // ↓在排除了一切header后，最不可能的就是答案↓
            'accept-language': acceptLanguage,
            connection: 'keep-alive',
        },
        method: 'HEAD',
        redirect: 'manual'
    })
        .then(resp => {
            if (resp.headers.has('location')) {
                redirectedURL = new URL(resp.headers.get('location'));
                return fetch(redirectedURL, {
                    headers: {
                        'user-agent': userAgent,
                        'accept-encoding': 'gzip',
                        connection: 'keep-alive'
                    },
                });
            } else {
                throw new LinkResolveError("ajaxm.php response's url not redirected", LinkResolveErrorCodes.URL_OF_AJAXM_PHP_RESPONSE_NOT_REDIRECTED, resp);
            }
        })
        .then(resp => {
            if (resp.headers.has('content-length')) {
                return {
                    length: Number(resp.headers.get('content-length')),
                    redirectedURL,
                }
            } else {
                throw new LinkResolveError("???'s response missing Content-Length header", LinkResolveErrorCodes.MISSING_CONTENT_LENGTH, resp);
            }
        });
}

export class LanzouStringTransmissionFormat {
    constructor() {
        throw new TypeError('你构造一个这玩意干嘛');
    }

    public static isValid(str: string) {
        if (str === '') return false;
        const pairs = str.split('&');

        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (!key || !value) return false;
        }

        return true;
    }

    public static parse(str: string) {
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

    public static stringify(obj: { [s: string]: string | number }) {
        return Object.keys(obj)
            .map(key => `${key}=${obj[key]}`)
            .join('&');
    }
}

function getAjaxmPHPHeaders(referer: URL) {
    return {
        "content-type": 'application/x-www-form-urlencoded',
        referer: referer.toString(),
        origin: referer.origin,
        "x-requested-with": 'XMLHttpRequest',
        connection: 'keep-alive'
    } as const;
}

function createAjaxmPHPBody(body: Parameters<typeof LanzouStringTransmissionFormat['stringify']>[0]) {
    try {
        return LanzouStringTransmissionFormat.stringify(body);
    } catch (e) {
        throw new LinkResolveError('LanzouStringTransmissionFormat.stringify failed', LinkResolveErrorCodes.WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED, e);
    }
}

export class LinkResolver {
    constructor(options: types.ResolveOptions) {
        Object.setPrototypeOf(options, null);

        if (typeof options.url === 'string') {
            options.url = new URL(options.url);
        }

        this.options = Object.freeze(options) as Readonly<types.ProcessedResolveOptions>;
    }

    protected document: DOMWindow['document'];
    protected options: Readonly<types.ProcessedResolveOptions>;

    public async resolve() {
        const pageURL = new URL(this.options.url.pathname, 'https://www.lanzoup.com');
        const result: types.ResolveResult = {
            downURL: new URL('http://example.org'),
            filename: '',
            filesize: 0
        };
        Object.setPrototypeOf(result, null);
        
        const html = await (await fetch(pageURL, {
            headers: {
                accept,
                "accept-language": acceptLanguage,
                "accept-encoding": 'gzip, deflate',
                "user-agent": userAgent,
                connection: 'keep-alive'
            },
            method: 'GET',
        })).text();

        this.document = new JSDOM(html).window.document;
        // 页面关闭处理
        const pageOffElement = this.document.querySelector('.off');
        if (pageOffElement) {
            const msg = pageOffElement.lastChild.textContent;
            if (msg.includes('文件取消分享')) {
                throw new LinkResolveError('File unshared', LinkResolveErrorCodes.FILE_UNSHARED, msg);
            } else {
                throw new LinkResolveError('Unknown page closure reason', LinkResolveErrorCodes.UNKNOWN_PAGE_CLOSURE_REASON, msg);
            }
        }

        const hasPassword = Boolean(this.document.querySelector('#pwd'));
        const filenameFromTitle = hasPassword
            ? this.document.title
            : this.document.title.slice(0, -6);
        // const filesizeFromMetaDescription = (this.window.document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content?.slice?.(5);
        if (hasPassword) {
            if (isEmpty(this.options.password)) {
                throw new LinkResolveError('Password required', LinkResolveErrorCodes.PASSWORD_REQUIRED);
            }

            const resp: types.AjaxmPHPResponse = await (await fetch(
                `https://www.lanzoup.com/ajaxm.php${html.match(/'*ajaxm.php(.*?)'/)[1]}`, 
                { // 我不知道正常网站请求后面的`?file=xxx`是干嘛的, 同行好像也没加; 但是我为了保险还是加了
                    headers: getAjaxmPHPHeaders(pageURL),
                    body: createAjaxmPHPBody({
                        action: 'downprocess',
                        sign: html.match(/skdklds = '(.*?)'/)[1],
                        p: this.options.password,
                        kd: html.match(/kdns =(.*?)/)?.[1] ?? 0
                    }),
                    method: 'POST',
                    redirect: 'manual'
                })).json();

            if (resp.zt) {
                result.downURL = new URL('/file/' + resp.url, resp.dom);
                result.filename = resp.inf as string;

                const getFilesizeAndRedirectedURLXxxResult =
                    await getFilesizeAndRedirectedURLFromAjaxmPHPResponseURL(result.downURL);

                result.filesize = getFilesizeAndRedirectedURLXxxResult.length;

                if (this.options.redirectedURL) {
                    result.downURL = getFilesizeAndRedirectedURLXxxResult.redirectedURL;
                }
            } else {
                if (resp.inf === '密码不正确') {
                    throw new LinkResolveError('Password incorrect', LinkResolveErrorCodes.PASSWORD_INCORRECT);
                } else {
                    throw new LinkResolveError('Unknown ajaxm.php response exception', LinkResolveErrorCodes.UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION, resp);
                }
            }
        } else {
            if (!isEmpty(this.options.password)) {
                console.warn('Password not needs');
            }

            const iframeURL = new URL(
                (this.document.querySelector('.ifr2') as HTMLIFrameElement).src,
                pageURL.origin
            );
            const iframeHTML = await (
                await fetch(iframeURL,
                    {
                        headers: {
                            accept,
                            "accept-language": acceptLanguage,
                            "accept-encoding": 'gzip, deflate',
                            "user-agent": userAgent,
                            connection: 'keep-alive'
                        },
                        method: 'GET'
                    })
            ).text();

            // this.iframeDocument = new JSDOM(iframeHTML).window.document;

            const resp: types.AjaxmPHPResponse = await (await fetch(
                `https://www.lanzoup.com/ajaxm.php${iframeHTML.match(/'*ajaxm.php(.*?)'/)[1]}`,
                { // 我不知道正常网站请求后面的`?file=xxx`是干嘛的, 同行好像也没加; 但是我为了保险还是加了
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
                result.downURL = new URL('/file/' + resp.url, resp.dom);
                result.filename = filenameFromTitle;

                const getFilesizeAndRedirectedURLXxxResult =
                    await getFilesizeAndRedirectedURLFromAjaxmPHPResponseURL(result.downURL);
                result.filesize = getFilesizeAndRedirectedURLXxxResult.length;

                if (this.options.redirectedURL) {
                    result.downURL = getFilesizeAndRedirectedURLXxxResult.redirectedURL;
                }
            } else {
                throw new LinkResolveError('Unknown ajaxm.php response exception', LinkResolveErrorCodes.UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION, resp);
            }
        }
        return result; 
    }
}