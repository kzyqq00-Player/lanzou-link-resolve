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

    /**
     * 主类
     */
    export class LinkResolver {
        constructor(options: ResolveOptions);

        /**
         * 进行解析。注意: 在构造时不会自动解析
         */
        public resolve(): Promise<ResolveResult>;
    }

    export interface ResolveOptions {
        /**
         * 蓝奏云原始下载url, 例如`https://xxx.lanzouu.com/123456789123`
         */
        url: URL | string;
        /**
         * 文件分享密码, 如无可忽略
         */
        password?: string;
        /**
         * 是否自动重定向到最终地址
         * @default false
         */
        redirectedURL?: boolean;
    }
    export interface ProcessedResolveOptions extends ResolveOptions {
        url: URL;
    }

    /**
     * 解析结果
     */
    export interface ResolveResult {
        /**
         * 直链地址
         */
        downURL: URL;
        /**
         * 文件名
         */
        filename: string;
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
        MISSING_CONTENT_LENGTH = -4,
        URL_OF_AJAXM_PHP_RESPONSE_NOT_REDIRECTED = -3,
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
         * 是否成功
         */
        zt: 0 | 1;
        /**
         * 域名
         */
        dom: string;
        /**
         * `<dom>/file/xxx`的`xxx`位置的值
         */
        url: 0 | string;
        /**
         * 有密码的页面为文件名,
         * 有/无密码如失败则为失败信息,
         * 无密码成功则为`0`
         */
        inf: 0 | string;
    }

    /**
     * 用于处理蓝奏云类JSON(以下称为蓝奏文本)传输中的转换
     */
    export class LanzouStringTransmissionFormat {
        /**
         * 是否是有效的蓝奏文本
         */
        public static isValid(str: string): boolean;

        /**
         * 将蓝奏文本转换回对象。如果不是有效的蓝奏文本, 将抛出`TypeError`
         */
        public static parse(str: string): object;

        /**
         * 将目标对象序列化为蓝奏文本
         */
        public static stringify(obj: { [s: string]: string | number }): string;
    }
}