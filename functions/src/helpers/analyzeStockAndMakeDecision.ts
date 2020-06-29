const admin = require('firebase-admin');
const db = admin.firestore()
import credentials from '../credentials'
import checkIfStockIsCurrentlyOwned from '../util/isCurrentlyOwned'

const Alpaca = require('@alpacahq/alpaca-trade-api')
const alpaca = new Alpaca({
  keyId: credentials.alpaca.key,
  secretKey: credentials.alpaca.secret,
  paper: credentials.alpaca.paper
})

/**
* Runs calculations for a stock, determines if we should buy/sell/do nothing, and does it
* @param {Object} stock 
* @returns {Promise} 
*/
export default function analyzeStockAndMakeDecision(stock){
  return new Promise(async (resolve, reject) => {

    // get analyticPoints for the time periods cooresponding to "history" and "current"
    let now = Date.now()
    let oldestTimeForHistory = now - stock.config.msHistoryToAverage;
    let recentTimeForHistory = now - stock.config.msCurrentToAverage;
    let oldestTimeForCurrent = (now - stock.config.msCurrentToAverage) - 1;
    let analyticResults = await Promise.all([
      db
      .collection("analyticPoints")
      .where("time", ">", oldestTimeForHistory)
      .where("time", "<", recentTimeForHistory)
      .where("stockId", "==", stock.id)
      .get(),
      db
      .collection("analyticPoints")
      .where("time", ">", oldestTimeForCurrent)
      .where("stockId", "==", stock.id)
      .get()
    ])

    // combine data from the history points
    let historyTotalSentiment=0;
    let historyTotalTweets=0;
    let numHistoryPoints = 0;
    analyticResults[0].forEach(doc => {
      let data = doc.data();
      if(data.sentiment) historyTotalSentiment += data.sentiment || 0;
      if(data.numTweetsIncluded) historyTotalTweets += data.numTweetsIncluded;
      numHistoryPoints += 1
    })
    let historyAverageSentiment = historyTotalSentiment / numHistoryPoints;
    let historyAverageTweetsPerPoint = historyTotalTweets / numHistoryPoints;

    // combine data from the current points
    let currentTotalSentiment=0;
    let currentTotalTweets=0;
    let numCurrentPoints = 0;
    analyticResults[1].forEach(doc => {
      let data = doc.data();
      if(data.sentiment) currentTotalSentiment += data.sentiment;
      if(data.numTweetsIncluded) currentTotalTweets += data.numTweetsIncluded;
      numCurrentPoints += 1
    })
    let currentAverageSentiment = currentTotalSentiment / numCurrentPoints;
    let currentAverageTweetsPerPoint = currentTotalTweets / numCurrentPoints;
    

    // ------------ BEGIN LOGIC to determine if we should buy or sell ---------
    let isNumberOfCurrentTweetsEnough = currentAverageTweetsPerPoint > historyAverageTweetsPerPoint * stock.config.amountOfTweetsRatioToHistory;

    let amountSentimentHasChanged = currentAverageSentiment - historyAverageSentiment; // neg if went down, positive if went up
    
    let hasSentimentIncreasedEnough = amountSentimentHasChanged > stock.config.sentimentAmountIncreaseThreshold 
    let hasSentimentDecreasedEnough = amountSentimentHasChanged < (stock.config.sentimentAmountDecreaseThreshold * -1)

    let shouldBuy = (isNumberOfCurrentTweetsEnough && hasSentimentIncreasedEnough);
    let shouldSell = (isNumberOfCurrentTweetsEnough && hasSentimentDecreasedEnough);
    // ------------------- END buy/sell logic -------------------------


    console.log(`${stock.dis} history avg sentiment: ${historyAverageSentiment}, current avg sentiment: ${currentAverageSentiment}`)
    
    if(numHistoryPoints < stock.config.minHistoryPoints){
      console.log(`Not enough historical data for ${stock.dis} to make a decision. numHistoryPoints: ${numHistoryPoints}, config minHistoryPoints: ${stock.config.minHistoryPoints}`)
      shouldBuy = false;
      shouldSell = false;
    }
    
    if(!isNumberOfCurrentTweetsEnough && shouldBuy) console.log('number of current tweets not enough to buy')

    // take action on buy/sell
    let isCurrentlyOwned = await checkIfStockIsCurrentlyOwned(stock.ticker);
    if(isCurrentlyOwned){
      if(shouldSell){
        // SELL THE STOCK
        // leaving this out for now. instead of deciding when to sell, we will set a stop order when we buy
        // I may add more logic to decide when to sell in the future, but i think stop will work better for this at the moment. 
        // let sellResult = await alpaca.closePosition(stock.ticker);
      }
      if(shouldBuy) console.log(`Attempted to buy ${stock.dis}, but we already own this stock`)
    }else{
      if(shouldBuy){
        await buyStock(stock, {currentAverageSentiment, historyAverageSentiment});
      }
    }

    // all done
    resolve()
  })
}

/**
* Take all actions necessary when we decide to buy a stock. Determines amount of stock to buy, executes trade, records transaction, and sets the stop orders
* @param {Object} stock 
* @param {Object} decisionInfo - information that helped us calcuate why to buy the stock. gets saved into DB for refrence 
* @returns {Promise} 
*/
const buyStock = function(stock, decisionInfo){
  return new Promise(async (resolve) => {
    // calculate how much of the stock to buy
    let assetInfo = await alpaca.getBars('minute', stock.ticker, {limit: 1})
    let price = assetInfo[stock.ticker][0].c || assetInfo[stock.ticker][0].closePrice; // i've been getting different objects in bars with different property names, maybe alpaca changed their API?
    let numSharesToBuy = Math.floor(stock.config.amountToInvest / price);

    if(numSharesToBuy === 0) return console.log(`Cant afford to buy ${stock.dis} right now, stock costs more than the amount you want to invest.`)
    console.log(`Buying ${stock.ticker} - ${numSharesToBuy} shares...`)

    // check if we have enough money 
    let accountInfo = await alpaca.getAccount()
    if(accountInfo.cash < (price*numSharesToBuy)){
      console.log("Not enough money to buy "+stock.dis)
      resolve()
      return 
    } 
    
    let clockRes = await alpaca.getClock()
    let isMarketOpen = clockRes.is_open;

    // execute trade
    let priceToSellAtProfit = price*(1+stock.config.sellAfterRisesPercent)
    const stop_price = price*(1-stock.config.sellIfDropsPercent);
    console.log('stop price', stop_price)
    try{
      let orderData: any = {
        symbol: stock.ticker,
        qty: numSharesToBuy,
        side: 'buy',
        order_class: "bracket",
        stop_loss: {
          stop_price: stop_price,
        }
      };
      if(isMarketOpen){
        orderData = {
          ...orderData,
          type: 'market',
          time_in_force: 'gtc',
          take_profit: {
            limit_price: priceToSellAtProfit
          },
        }
      }else{
        // this is an after hours order we're queueing up 
        orderData = {
          ...orderData,
          type: 'limit',
          limit_price: price * (1+stock.config.afterHoursLimitPriceIncreasePercent),
          time_in_force: 'day', // must be day or gtc, but ideally i wanted opg...
          take_profit: {
            limit_price: priceToSellAtProfit * (1+stock.config.afterHoursPriceToSellAtIncreasePercent)
          },
        }
      }
      let tradeResult = await alpaca.createOrder(orderData);
      console.log(`Succesfully placed orders for ${stock.dis}!`)

      // record what happened in Firebase for our records
      await db.collection("transactions").doc().set({
        ticker: stock.ticker,
        type: 'buy',
        alpaca_result:  tradeResult,
        numShares: numSharesToBuy,
        time_initiated: Date.now(),
        decisionInfo: decisionInfo,
      })

    }catch(e){
      // stock purchase failed
      console.log('stock purchase failed for '+stock.dis, e.message)
      return resolve()
    }

    resolve()
  })
}