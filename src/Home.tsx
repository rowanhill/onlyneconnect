import React from 'react';
import firebase from './firebase';

export const Home = () => {
    const signOut = () => {
        firebase.auth().signOut()
    };
    return (
        <button onClick={signOut}>Sign out</button>
    );
};