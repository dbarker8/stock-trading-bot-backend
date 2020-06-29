import credentials from '../credentials'

// firebase
const admin = require('firebase-admin');
const db = admin.firestore()

// twitter
var Twit = require('twit')
var T = new Twit({
  ...credentials.twitter,
  timeout_ms: 60*1000, 
  strictSSL: true, 
})

/**
* Grabs all tweets from Twitter for a stock and returns them. Nothing later than our most recent tweetID, limit to CONFIG # tweets, start with most recent/newest
* @param {Object} stock 
* @returns {Promise} tweets
*/
export default function queryTwitterForStock(stock):Promise<any[]>{
  return new Promise(async (resolve, reject) => {

    // get most recent tweet in DB for this stock (to limit twitter query and prevent dupes)
    let recentTweetQuery = await db.collection('tweets')
      .where('stockId', '==', stock.id)
      .orderBy('twitterId', 'desc')
      .limit(1)
      .get();
    let recentTweet = undefined;
    recentTweetQuery.forEach(tweet => {
      recentTweet = tweet.data()
    })

    // Query twitter for this stock. 
    let searchParams: any = {
      q: `${stock.searchValue}`,
      count: stock.config.tweetsPerRequestLimit,
      tweet_mode: 'extended',
      result_type: 'recent',
      lang: 'en'
    };
    if(stock.hashtags) stock.hashtags.forEach(hashtag => { searchParams.q += ` #${hashtag}`})
    if(recentTweet) searchParams.since_id = recentTweet.twitterId;
    T.get('search/tweets', searchParams, function(err, data, response) {
      let formattedTweets = [];
      data.statuses.forEach(tweet => {
        formattedTweets.push({
          text: tweet.full_text,
          twitterId: tweet.id_str,
          handle: tweet.user.screen_name,
          postedAt: new Date(tweet.created_at).getTime(), 
          savedAt: new Date().getTime(),
          stockId: stock.id
        });
      })
      // resolve with tweets
      resolve(formattedTweets)
    })

  })
}