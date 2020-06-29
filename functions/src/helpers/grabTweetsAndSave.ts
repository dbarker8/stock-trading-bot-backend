import queryTwitterForStock from "./queryTwitterForStock"
import analyzeTweets from "./analyzeTweets";
const admin = require('firebase-admin');
const db = admin.firestore()

/**
* Grabs new tweets for a stock, analyzes them with IBM, and saves them to firebase. resolves when complete
*/
export default function grabTweetsAndSave(stock){
  return new Promise(async (resolve, reject) => {

    let tweets: any[] = await queryTwitterForStock(stock);
    
    let analyzed: any = await analyzeTweets(tweets);

    // save all analyzed tweets to firebase
    let batch = db.batch();
    let totalTweets = 0;
    analyzed.forEach(tweet => {
      let newRef = db.collection('tweets').doc();
      if(tweet){ // ignore null from invalid tweets
        totalTweets += 1
        batch.set(newRef, tweet);
      }
    })
    batch.commit().then(() => {
      console.log(`number of tweets saved for this stock (${stock.dis}): `, totalTweets)
      // resolve once all tweets are saved
      resolve();
    }).catch(err => {
      console.warn('err saving batch to firebase', err)
    })

  })
}