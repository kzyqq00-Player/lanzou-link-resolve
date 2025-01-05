const { LinkResolver } = require('./dist/index.js')

console.time('test');
new LinkResolver({
    url: 'https://kkwz.lanzout.com/iifcz2jwtkmf',
    password: 'samp'
}).resolve().then(res => {
    console.log(res);
    console.timeEnd('test');
}, console.error);