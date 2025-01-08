"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkResolveError = void 0;
exports.isEmpty = isEmpty;
exports.getMoreInfoFromAjaxmPHPResponseURL = getMoreInfoFromAjaxmPHPResponseURL;
exports.getAjaxmPHPHeaders = getAjaxmPHPHeaders;
exports.createAjaxmPHPBody = createAjaxmPHPBody;
const index_1 = require("./index");
const node_url_1 = require("node:url");
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
exports.LinkResolveError = LinkResolveError;
async function getMoreInfoFromAjaxmPHPResponseURL(ajaxmPHPResponseURL) {
    let redirectedURL;
    return await fetch(ajaxmPHPResponseURL, {
        headers: {
            'user-agent': index_1.userAgent,
            accept: index_1.accept,
            'accept-encoding': 'gzip',
            // ↓在排除了一切header后，最不可能的就是答案↓
            'accept-language': index_1.acceptLanguage,
            connection: 'keep-alive',
        },
        method: 'HEAD',
        redirect: 'manual'
    })
        .then(resp => {
        if (resp.headers.has('location')) {
            redirectedURL = new node_url_1.URL(resp.headers.get('location'));
            return fetch(redirectedURL, {
                headers: {
                    'user-agent': index_1.userAgent,
                    'accept-encoding': 'gzip',
                    connection: 'keep-alive'
                },
            });
        }
        else {
            throw new LinkResolveError("ajaxm.php response's url not redirected", index_1.LinkResolveErrorCodes.URL_OF_AJAXM_PHP_RESPONSE_NOT_REDIRECTED, resp);
        }
    })
        .then(resp => {
        if (resp.headers.has('content-length')) {
            return {
                length: Number(resp.headers.get('content-length')),
                redirectedURL,
                filename: decodeURIComponent(resp.headers.get('content-disposition').match(/filename= (.*)/)?.[1]
                    ?? resp.headers.get('content-disposition').match(/filename="(.*)"/)[1])
            };
        }
        else {
            throw new LinkResolveError("???'s response missing Content-Length header", index_1.LinkResolveErrorCodes.MISSING_CONTENT_LENGTH, resp);
        }
    });
}
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
        return new URLSearchParams(body).toString();
    }
    catch (e) {
        throw new LinkResolveError('LanzouStringTransmissionFormat.stringify failed', index_1.LinkResolveErrorCodes.WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED, e);
    }
}
