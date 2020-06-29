import credentials from '../credentials'
const bluebird = require('bluebird');
const vader = require('vader-sentiment');

/**
* Analyzes tweets with IBM
* @param {Array} tweets 
* @returns {Promise} tweets - the tweets, with nluData property added.
*/
export default function analyzeTweets(tweets: Array<any>){
  return new Promise((resolve, reject) => {
    bluebird.map(tweets, mapFunction, {concurrency: 200}).then(allDone => { // http://bluebirdjs.com/docs/api/promise.map.html
      console.log('done processing')
      resolve(allDone);
    }).catch(err => {
      console.warn('bluebird map err', err)
    })
  })
}

/**
* Analyzes a tweet. It doesnt need to be a promise, but im leaving it as a promise so I can add in more async analysis functions later easily 
* @param {Object} tweet 
* @returns {Promise} tweet - the tweet, with nluData property added.
*/
const mapFunction = function(tweet){
  return new Promise((resolve, reject) => {
    try{
      let result = vader.SentimentIntensityAnalyzer.polarity_scores(tweet.text)
      resolve({
        nluData: {sentiment: result.compound, sentimentDetails: result},
        ...tweet
      })
    }catch(e){
      console.log("Sentiment analysis error", e)
      resolve(null)
    }
  })
}