// firebase
process.env.GOOGLE_APPLICATION_CREDENTIALS = '../../google_creds.json';

const admin = require('firebase-admin');
const functions = require('firebase-functions')

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

let getAnalyticDocsForToday = function(){

  // apple LvCO9wx3lmSqBnvkjaxu
  const ticker = 'CDriHopNOKsRRCcuo4V9'

  db.collection('analyticPoints')
  .where('stockId', '==', ticker)
  .orderBy('time', 'desc')
  .limit(50)
  .get().then(analyticItemQuery => {
    let points = [];
    analyticItemQuery.forEach(item => {
      points.push(item.data())
    })
  
    let now = Date.now();
    let today = new Date();
    today.setHours(0)
    today.setMinutes(0);
    today.setSeconds(0)
    today.setMilliseconds(0);
    let todayBegin = today.getTime();
  
    points = points.filter(x => x.time >= todayBegin)
  
    let descriptions = points.map((p, index) => {
      if(index !== 0){
        let lastPoint = points[index-1]
        if(new Date(lastPoint.time).getTime() === new Date(p.time).getTime()) console.log("SAME TIME")
      }
      return `${new Date(p.time).toString()} ${p.numTweets}`
    })
    console.log("Points", descriptions)
  })

}

getAnalyticDocsForToday()