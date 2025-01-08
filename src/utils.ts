import {accept, acceptLanguage, LinkResolveErrorCodes, userAgent} from "./index";
import {URL} from "node:url";

export function isEmpty(val: any) {
    return val === '' || val === null || val === undefined || Object.keys(val).length === 0;
}

export class LinkResolveError extends Error {
    constructor(message?: string, code?: LinkResolveErrorCodes, data?: any) {
        super(message);
        this.code = code;
        this.data = data;
    }

    public data?: any;
    public code?: number;
}

export async function getMoreInfoFromAjaxmPHPResponseURL(ajaxmPHPResponseURL: URL) {
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
                    filename: decodeURIComponent(
                        resp.headers.get('content-disposition').match(/filename= (.*)/)?.[1]
                        ?? resp.headers.get('content-disposition').match(/filename="(.*)"/)[1]
                    )
                }
            } else {
                throw new LinkResolveError("???'s response missing Content-Length header", LinkResolveErrorCodes.MISSING_CONTENT_LENGTH, resp);
            }
        });
}

export function getAjaxmPHPHeaders(referer: URL) {
    return {
        "content-type": 'application/x-www-form-urlencoded',
        referer: referer.toString(),
        origin: referer.origin,
        "x-requested-with": 'XMLHttpRequest',
        connection: 'keep-alive'
    } as const;
}

type ConstructorParameters<T extends abstract new (...args: any[]) => any> = T extends abstract new (...args: infer P) => any ? P : never;

export function createAjaxmPHPBody(body: ConstructorParameters<typeof URLSearchParams>[0]) {
    try {
        return new URLSearchParams(body).toString();
    } catch (e) {
        throw new LinkResolveError('LanzouStringTransmissionFormat.stringify failed', LinkResolveErrorCodes.WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED, e);
    }
}