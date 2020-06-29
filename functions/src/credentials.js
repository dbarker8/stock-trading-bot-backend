let exportObject =  {
  ibm: {
    "apikey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "iam_apikey_description": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "iam_apikey_name": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "iam_role_crn": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "iam_serviceid_crn": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "url": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  twitter: {
    consumer_key:         'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    consumer_secret:      'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    access_token:         'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    access_token_secret:  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  }
}

let alpacaCreds = {
  realmoney: { 
    key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    paper: false
  },
  testenv: { 
    key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    paper: true
  }
}

// just change this to toggle between real money and test
exportObject.alpaca = alpacaCreds.testenv;

export default exportObject;