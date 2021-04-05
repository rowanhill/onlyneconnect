import { createContext } from 'react';
import firebase from 'firebase';

export const UserContext = createContext({
    initialising: true,
    user: null as (firebase.User | null),
});
