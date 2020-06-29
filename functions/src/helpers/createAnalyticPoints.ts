// firebase
const admin = require('firebase-admin');
const db = admin.firestore()
let one_minute = 1000*60

/**
* searches all tweets for a given stock, and creates analyticPoints for them if necessary
* @param {Object} stock 
* @returns {Promise} promise - resolves when analytics are saved
*/
export default function createAnalyticPoints(stock){
  return new Promise(async (resolve, reject) => {
    
    // get most recent analytic doc
    let analyticItemQuery = await db.collection('analyticPoints')
      .where('stockId', '==', stock.id)
      .orderBy('time', 'desc')
      .limit(20)
      .get();

    let mostRecentAnalytic = undefined;
    let existingPointsObject = {}
    analyticItemQuery.forEach(item => {
      if(!mostRecentAnalytic) mostRecentAnalytic = item.data();
      existingPointsObject[item.data().time] = item
    })
    console.log('most recent time counted is '+new Date(mostRecentAnalytic.mostRecentTimeCounted).toString())

    // get all tweets newer than that doc
    let tweetQuery = await db
      .collection("tweets")
      .where("postedAt", ">",  (mostRecentAnalytic || {}).mostRecentTimeCounted ? mostRecentAnalytic.mostRecentTimeCounted : Date.now() - (one_minute*35) )
      .where("stockId", "==", stock.id)
      .get();


    // group the tweets based on analyticPoint times
    let groupedTweets = {};
    let tweetCount = 0;
    let mostRecentTimeCounted = 0;
    tweetQuery.forEach(t => {
      tweetCount += 1
      let tweet = t.data();
      if(new Date(tweet.postedAt) > new Date(mostRecentTimeCounted)) mostRecentTimeCounted = tweet.postedAt
      let analyticTime = getGroupingTime(tweet.postedAt);
      if(groupedTweets[analyticTime]){
        groupedTweets[analyticTime].push(tweet);
      }else{
        groupedTweets[analyticTime] = [tweet];
      }
    });
    console.log('tweet count', tweetCount)

    // create new analyticPoints to add
    let newAnalyticPoints = [];
    Object.keys(groupedTweets).forEach(async timeKey => {
      let tweetList = groupedTweets[timeKey];
      const { totals, numTweetsIncluded } = getTotalsForTweetList(tweetList);
      let newAnalyticPoint:any = {
        totals,
        numTweetsIncluded,
        time: parseInt(timeKey),
        stockId: stock.id,
        ticker: stock.ticker,
        mostRecentTimeCounted,
        timeStr: new Date(parseInt(timeKey)).toString()
      };
      newAnalyticPoint = calculateAndSetAverages(newAnalyticPoint);
      if(existingPointsObject[timeKey]){
        // analytic already exists in DB. update it and save it to DB
        await combineAndUpdateExistingAnalytic(existingPointsObject[timeKey], newAnalyticPoint);
      }else{
        // make a new analytic
        newAnalyticPoints.push(newAnalyticPoint);
      }
    })

    // save all new analyticPoints to DB (usually just one new point), resolve once complete
    let batch = db.batch();
    newAnalyticPoints.forEach(point => {
      let newRef = db.collection('analyticPoints').doc();
      if(point) batch.set(newRef, point);
    })
    try{
      await batch.commit()
        console.log(`number of points saved for this stock (${stock.dis}): `, newAnalyticPoints.length)
    }catch(e){
      console.warn('err saving analyticPoints batch to firebase', e)
    }

    resolve();
  })
}

/**
* Returns the time for the analytic doc to put the tweet under, based on its time
* @param  time - the time of the tweet
* @returns  time - the time of the analytic doc to use
*/
const getGroupingTime = function(time){
  let d = new Date(time);
  let min = d.getMinutes();
  // hard coded 30 min intervals
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  if(min>30){
    d.setHours(d.getHours()+1)
    d.setMinutes(0);
  }else{
    d.setMinutes(30);
  }
  let newTime = d.getTime();

  return newTime;
}

/**
* calculates total values for all tweets and returns it
* @param {Array} list - The list of tweets with NLU data on them
* @returns {Object} results - an object with the total results
*/
const getTotalsForTweetList = function(list){
  let totals = {
    sentiment: 0,
  };
  let numTweetsIncluded = 0;
  list.forEach(t => {
    try{
      if(t.nluData){
        totals.sentiment += t.nluData.sentiment
        numTweetsIncluded += 1;
      }
    }catch(e){
      // error, nluData probably does not exist. ignore this tweet
    }
  })

  return {totals, numTweetsIncluded};
}

/**
* calculates averages based on the "totals" key on the analyticPoint, and sets them
* @param {Object} analyticPoint
* @returns {Object} analyticPoint
**/
const calculateAndSetAverages = function(point){
  let newPoint = {...point};
  Object.keys(point.totals).forEach(key => {
    newPoint[key] = point.totals[key] / point.numTweetsIncluded
  })
  return newPoint
}


/**
* combines an existing analyticDoc and a new analyticPoint, and then updates the existing doc in firebase
* @param {Object} existingDoc - a firebase doc object of an analyticPoint
* @param {Object} newPoint - a regular object of a new analyticPoint
* @returns {Promise}
*/
const combineAndUpdateExistingAnalytic = function(existingDoc, newPoint){
  let originalNumberOfTweets = existingDoc.data().numTweetsIncluded;
  return new Promise(resolve => {
    let newDoc = existingDoc.data()

    if(newPoint.totals && newDoc.totals){ // some old docs had no totals. this will only block those posts, and we can remove this if() after 1 week
      Object.keys(newPoint.totals || {}).forEach(key => {
        newDoc.totals[key] += newPoint.totals[key];
      })
      newDoc.numTweetsIncluded += newPoint.numTweetsIncluded
      newDoc = calculateAndSetAverages(newDoc);
      newDoc.mostRecentTimeCounted = newPoint.mostRecentTimeCounted
    }

    db.collection("analyticPoints").doc(existingDoc.id).update(newDoc).then(done => {
      console.log(`updated existing analyticDoc. old num tweets: ${originalNumberOfTweets}, new number of tweets: ${newDoc.numTweetsIncluded}`)
      resolve()
    })
  })
}
