require('source-map-support').install()
import * as functions from 'firebase-functions'
import admin from 'firebase-admin'

admin.initializeApp(functions.config().firebase)

import checkerTask from './checkerTask';

export default checkerTask