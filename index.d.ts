declare module 'lanzou-link-resolve' {
    /**
     * 模拟UA
     */
    export const userAgent: string;
    /**
     * 模拟`Accept`请求头
     */
    export const accept: string;
    /**
     * 模拟`Accept-Language`请求头
     */
    export const acceptLanguage: string;


    export interface ResolveOptions {
        /**
         * 蓝奏云原始下载url, 例如`https://xxx.lanzouu.com/123456789123`
         */
        url: URL | string;
        /**
         * 文件分享密码, 如无可忽略
         */
        password?: string;
    }
    export interface ProcessedResolveOptions extends ResolveOptions {
        url: URL;
    }

    /**
     * 解析结果
     * 
     * 注意: 无法获取的值将会是`undefined`, 请在自己的程序中进行处理(例如: 重试/提醒用户)。
     */
    export interface ResolveResult {
        /**
         * 直链地址
         */
        downURL: URL;
        /**
         * 文件名
         */
        filename?: string;
        /**
         * 文件大小, 以字节为单位
         */
        filesize: number;
    }

    /**
     * 正数代表参数错误, 反之代表内部错误
     * 
     * 注意: 内部错误通常代表已经失效了, 请提交issue并附带错误信息
     */
    export enum LinkResolveErrorCodes {
        WITHOUT_PASSWORD_UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION = -3,
        WITHOUT_PASSWORD_JSON_STRINGIFY_FAILED = -2,
        UNKNOWN_AJAXM_PHP_RESPONSE_EXCEPTION = -1,
        PASSWORD_REQUIRED = 1,
        PASSWORD_INCORRECT = 2,
        // 3(含)-10(不含)之间代表页面已经被关闭了, 典型的例如文件取消分享了
        // `throw`的`LinkResolveError`的`data`属性将是页面上的信息
        UNKNOWN_PAGE_CLOSURE_REASON = 3,
        FILE_UNSHARED = 3.1,
    }

    /**
     * `ajaxm.php`的响应
     */
    export interface AjaxmPHPResponse {
        /**
         * 可能代表是否成功
         */
        zt: 0 | 1;
        /**
         * 域名
         */
        dom: string;
        /**
         * `<dom>/file/?xxx`的`xxx`位置的值
         */
        url: 0 | string;
        /**
         * 文件名, 失败则为失败信息
         */
        inf: string;
    }
}