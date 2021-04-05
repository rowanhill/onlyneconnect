import { useState, useEffect } from 'react';
import firebase from '../firebase';

export const useAuth = () => {
    const [state, setState] = useState(() => {
        const user = firebase.auth().currentUser;
        return { initialising: !user, user };
    });
    function onChange(user: firebase.User | null) {
        setState({ initialising: false, user });
    }
  
    useEffect(() => {
        // listen for auth state changes
        const unsubscribe = firebase.auth().onAuthStateChanged(onChange);

        // unsubscribe to the listener when unmounting
        return () => unsubscribe();
    }, []);
  
    return state;
};