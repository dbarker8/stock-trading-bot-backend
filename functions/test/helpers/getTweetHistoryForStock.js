// firebase
process.env.GOOGLE_APPLICATION_CREDENTIALS = '../../google_creds.json';

const admin = require('firebase-admin');
const functions = require('firebase-functions')

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

let getTweetHistoryForStock = function(){

  const nikeId = 'CDriHopNOKsRRCcuo4V9'
  const appleId = 'LvCO9wx3lmSqBnvkjaxu'

  db.collection('tweets')
  .where('stockId', '==', nikeId)
  .orderBy('twitterId', 'desc')
  .limit(200)
  .get().then(tweetQuery => {
    let tweets = [];
    tweetQuery.forEach(item => {
      tweets.push(item.data())
    })
  
    tweets.forEach((tweet, index) => {
      tweets.forEach((tweet2, index2) => {
        if(tweet2.twitterId === tweet.twitterId && index !== index2) console.log('found a dupe !!!!!!!!!!!@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
      })
    })
    console.log('len tweets', tweets.length)
    let descriptions = tweets.map((tweet, index) => `${index}: ${new Date(tweet.postedAt).toString()}`)
    console.log(descriptions)
  })

}

getTweetHistoryForStock()