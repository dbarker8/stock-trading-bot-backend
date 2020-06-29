process.env.GOOGLE_APPLICATION_CREDENTIALS = './google_creds.json';
const bluebird = require('bluebird');

// helpers
import grabTweetsAndSave from './helpers/grabTweetsAndSave';
import createAnalyticPoints from './helpers/createAnalyticPoints';
import analyzeStockAndMakeDecision from './helpers/analyzeStockAndMakeDecision';

// firebase
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore()

/**
* This is the task triggered by the scheduler. Gets tweets, analyzes, creates analytics, and makes decisions for each stock.
*/
const checkerTask = functions.pubsub.topic('checkertask').onPublish(funcData => {
  // const checkerTask = functions.https.onRequest((req, res) => { // npm run serve , used for easy local testing
    return new Promise(async (resolve, reject) => {
      console.log("Begin checkerTask...")
  
      //0. grab default config
      let config_query = await db.collection('config').doc('default').get()
      let default_config = config_query.data();
  
      // 1. grab list of all stocks being tracked
      let stockQuery = await db.collection('stocks').where('isActive', '==', true).get();
      let stocks = [];
      stockQuery.forEach(item => stocks.push({...item.data(), id: item.id}));
      // set config for each stock - use default, or custom for this stock
      stocks = stocks.map(item => ({
        ...item,
        config: item.config ? {...default_config, ...item.config} : default_config 
      }));
      console.log(`Got all stocks. total ${stocks.length}`)
  
      // 2. get tweets for all stocks
      await bluebird.each(stocks, function(stock){
        return grabTweetsAndSave(stock)
      });
      console.log('Done getting tweets for all stocks')
  
      // 3. generate analytics for each stock
      let analyticPromises = [];
      stocks.forEach(stock => analyticPromises.push( createAnalyticPoints(stock) ));
      await Promise.all(analyticPromises);
      console.log('Done generating analytics and saving them')
  
      // 4. make decisions and execute trades for each stock
      let decisionPromises = [];
      stocks.forEach(stock => decisionPromises.push( analyzeStockAndMakeDecision(stock) ));
      await Promise.all(decisionPromises);
      console.log("done making decisions ")
      
      // all done! exit cloud function
      console.log("All Done! Exiting function")
      resolve()
    })
  })
  
  export default checkerTask
  