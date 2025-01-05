const { LinkResolver } = require('./dist/index.js')

try {
    console.log(
        new LinkResolver({
            url: 'https://kkwz.lanzout.com/iifcz2jwtkmf',
            password: 'samp'
        }).resolve().then(console.log)
    )
}
catch (e) {
    console.error(e);
}