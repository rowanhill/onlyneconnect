import React from 'react';
import { useAuth } from './hooks/useAuth';
import { UserContext } from './contexts/user';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { SignInCard } from './SignInCard';
import { LoggedInApp } from './LoggedInApp';

function App() {
    const { initialising, user } = useAuth();

    return (
    <UserContext.Provider value={{initialising, user}}>
    <Router>
        <Switch>
            <Route exact path="/sign-in">
                <SignInCard />
            </Route>
            <Route path="/">
                <LoggedInApp />
            </Route>
        </Switch>
    </Router>
    </UserContext.Provider>
    );
}

export default App;
