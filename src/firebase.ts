import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const config = {
    apiKey: process.env.REACT_APP_APIKEY,
    authDomain: process.env.REACT_APP_AUTHDOMAIN,
    projectId: process.env.REACT_APP_PID,
    storageBucket: process.env.REACT_APP_SB,
    messagingSenderId: process.env.REACT_APP_SID,
    appId: process.env.REACT_APP_APPID,
};
firebase.initializeApp(config);

const auth = firebase.auth();
const db = firebase.firestore();

if ((window as any).Cypress) {
    db.settings({
        experimentalForceLongPolling: true,
    });
}
if ((window as any).Cypress || window.location.hostname === "localhost") {
    db.useEmulator("localhost", 8080);
    auth.useEmulator('http://localhost:9099/');
}

export default firebase;