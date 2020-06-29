// const bluebird = require('bluebird');
// import credentials from '../credentials'

// // IBM Watson
// const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
// const { IamAuthenticator } = require('ibm-watson/auth');
// const nlu = new NaturalLanguageUnderstandingV1({
//   authenticator: new IamAuthenticator({ apikey: credentials.ibm.apikey }),
//   version: '2018-04-05',
//   url: credentials.ibm.url
// });

// /**
// * Analyzes tweets with IBM
// * @param {Array} tweets 
// * @returns {Promise} tweets - the tweets, with nluData property added.
// */
// export default function analyzeTweets(tweets: Array<any>){
//   return new Promise((resolve, reject) => {
//     // ibm limits nlu to 20 concurrent requests
//     bluebird.map(tweets, mapFunction, {concurrency: 19}).then(allDone => { // http://bluebirdjs.com/docs/api/promise.map.html
//       console.log('done processing')
//       resolve(allDone);
//     }).catch(err => {
//       console.warn('bluebird map err', err)
//     })
//   })
// }

// /**
// * @param {Object} tweet 
// * @returns {Promise} tweet - the tweet, with nluData property added.
// */
// const mapFunction = function(tweet){
//   return new Promise((resolve, reject) => {
//     try{
//       nlu.analyze({
//         text: tweet.text,
//         features: {
//           entities: {
//             emotion: true,
//             sentiment: true,
//             limit: 8 // sometimes it doesnt pick up the main entity in the first few ...
//           },
//           categories: {
//             limit: 3, 
//           },
//           emotion: {document: true},
//           sentiment: {document: true}
//         }
//       }).then(done => {
//         resolve({
//           nluData: done.result,
//           ...tweet
//         })
//       }).catch(err => {
//         console.warn('nlu analyze error', err)
//         resolve(null)
//       })
//     }catch(e){
//       // probably an unsupported language error, so just throw that tweet out for now
//       console.log("IBM Error in mapFunction...:", e)
//       resolve(null)
//     }
//   })
// }