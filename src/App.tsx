import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { SignInPage } from './SignInPage';
import { LoggedInApp } from './LoggedInApp';
import { GenericErrorBoundary } from './GenericErrorBoundary';
import { GameRulesPage } from './GameRulesPage';

function App() {
    return (
    <GenericErrorBoundary>
    <Router>
        <Switch>
            <Route exact path="/sign-in">
                <SignInPage />
            </Route>
            <Route exact path="/game-rules">
                <GameRulesPage />
            </Route>
            <Route path="/">
                <LoggedInApp />
            </Route>
        </Switch>
    </Router>
    </GenericErrorBoundary>
    );
}

export default App;
