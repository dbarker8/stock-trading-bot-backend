

var alpacaCreds = {
    key: "PK8L8W4M35UTM3ATUDER",
    secret: 'FnZE7ewjYXRMy9QhcUwGa5CiMyyluCu0TBNdPECg'
};
var Alpaca = require('@alpacahq/alpaca-trade-api');
var alpaca = new Alpaca({
    keyId: alpacaCreds.key,
    secretKey: alpacaCreds.secret,
    paper: true
});

// let isCurrentlyOwned = require('../lib/util/isCurrentlyOwned.js')
// alpaca.createOrder({
//   symbol: 'TSLA',
//   qty: 2,
//   side: 'buy',
//   type: 'market',
//   time_in_force: 'day'
// }).then(res => {
//   console.log('trade res',res)
// })

alpaca.getBars('minute', 'LOGI', {limit: 1}).then(assetInfo => {
  let price = assetInfo['LOGI'][0].h; // if were only getting 1, high"h" and low"l" are the same
  console.log('asetinfo', assetInfo);
  console.log('price', price);

})

// alpaca.closePosition('AAPL').then(res => {
//     console.log('code',res.code)
//     console.log(res)
// }).catch(err => {
//     console.log('error', err)
// })

// alpaca.getPosition("TSLA").then(res => {
//     console.log(res)
// })
// let ticker = 'TSLA'
// isCurrentlyOwned.default(ticker).then(result => {
//   console.log(`is ${ticker} currently owned ? `, result)
// })




// alpaca.getBars('minute', 'TSLA', {limit: 1}).then(res => {
//     console.log(res)
//     console.log(new Date(res.TSLA[0].t*1000).toString())
// })

// alpaca.getAccount().then(res => {
//     console.log(res)
// })

