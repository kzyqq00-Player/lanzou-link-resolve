const { LinkResolver } = require('./dist/index.js');

console.time('test');
new LinkResolver({
    url: 'https://kkwz.lanzoup.com/iifcz2jwtkmf',
    password: 'samp'
})
    .resolve()
    .then(res => {
        console.log(res);
        console.timeEnd('test');
    }, e => {
        console.timeEnd('test');
        throw e;
    });