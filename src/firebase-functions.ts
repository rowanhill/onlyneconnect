import firebase from 'firebase/app';
import 'firebase/functions';

if ((window as any).Cypress || window.location.hostname === 'localhost') {
    firebase.functions().useEmulator('localhost', 5001);
}