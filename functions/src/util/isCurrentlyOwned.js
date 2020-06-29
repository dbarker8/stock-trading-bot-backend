import credentials from '../credentials'

const Alpaca = require('@alpacahq/alpaca-trade-api')
const alpaca = new Alpaca({
  keyId: credentials.alpaca.key,
  secretKey: credentials.alpaca.secret,
  paper: credentials.alpaca.paper
})

/**
* Determine if we already own, or have an active buy order for this stock
* @param {String} ticker
* @returns {Promise} result - a boolean indicating if we own the stock
*/
export default async function(ticker){
  return new Promise(async resolve => {
    let isCurrentlyOwned = false
    try{
  
      // check if we have a pending after hours order already 
      await alpaca.getOrders({ status: 'open' }).then(orders => {
        (orders || []).forEach(o => {
          if(o.symbol===ticker && o.side==='buy' && o.status==='accepted'){
            // we have already placed an after hours order that will fill once market opens. Probably was placed a short time ago
            isCurrentlyOwned = true;
          }
        })
      })
  
      if(isCurrentlyOwned != true){
        // check if we alreadyt own the stock
        let position = await alpaca.getPosition(ticker); //  this will error and trigger catch if we have no position
        isCurrentlyOwned = true // no error, so position exists
      }

      resolve(isCurrentlyOwned)

    }catch(e){ // means no position exists
      isCurrentlyOwned = false;
      resolve(isCurrentlyOwned)
    }
  })

}