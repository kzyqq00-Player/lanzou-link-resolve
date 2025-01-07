# 蓝奏云直链解析.ts

一个可以解析蓝奏云直链的ts库。

感谢前车之鉴: [hanximeng/LanzouAPI](https://github.com/hanximeng/LanzouAPI)

**此项目还没有稳定，api随时可能改动，`1.0.0`后api变动将会减少。**

## 待办事项

- [ ] 解析文件夹直链

## 使用实例

比如解析一个`https://lanzout.com/iifcz2jwtkmf`:

```typescript
// noinspection JSAnnotator

import {LinkResolver} from "lanzou-link-resolve";

const resolver = new LinkResolver({
    url: 'https://lanzout.com/iifcz2jwtkmf',
    password: 'samp'
});

const result = await resolver.resolve();
console.log(result);
```

输出类似

```
[Object: null prototype] {
  downURL: URL {
    href: 'https://i-582.wwentua.com:446/01080200216570155bb/2025/01/04/0f2d4cc022e9fd6c919399a1bcfac772.txt?st=wB4bcGlZQ5iMUZdXrOIMGg&e=1736277756&b=Cbxcxwm9WbVQll_b3BbpS6gndWigBdAF_aCS4_c&fi=216570155&pid=117-136-49-182&up=2&mp=0&co=0',
    origin: 'https://i-582.wwentua.com:446',
    protocol: 'https:',
    username: '',
    password: '',
    host: 'i-582.wwentua.com:446',
    hostname: 'i-582.wwentua.com',
    port: '446',
    pathname: '/01080200216570155bb/2025/01/04/0f2d4cc022e9fd6c919399a1bcfac772.txt',
    search: '?st=wB4bcGlZQ5iMUZdXrOIMGg&e=1736277756&b=Cbxcxwm9WbVQll_b3BbpS6gndWigBdAF_aCS4_c&fi=216570155&pid=117-136-49-182&up=2&mp=0&co=0',
    searchParams: URLSearchParams {
      'st' => 'wB4bcGlZQ5iMUZdXrOIMGg',
      'e' => '1736277756',
      'b' => 'Cbxcxwm9WbVQll_b3BbpS6gndWigBdAF_aCS4_c',
      'fi' => '216570155',
      'pid' => '117-136-49-182',
      'up' => '2',
      'mp' => '0',
      'co' => '0' },
    hash: ''
  },
  filename: '直链！.txt',
  filesize: 138
}
```