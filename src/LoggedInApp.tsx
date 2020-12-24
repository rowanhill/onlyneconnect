import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { Home } from './Home';
import { CreateTeamPage } from './CreateTeamPage';
import { JoinTeamPage } from './JoinTeamPage';
import { QuizPage } from './QuizPage';

export function LoggedInApp() {
    const { initialising, user } = useAuth();
    const history = useHistory();

    if (!initialising && !user) {
        window.localStorage.setItem('sign-in-redirect', history.location.pathname);
        return <Redirect to="/sign-in" />;
    } else if (initialising) {
        return <p>Loading...</p>;
    } else {
        window.localStorage.removeItem('sign-in-redirect');
    }

    return (
        <Switch>
            <Route path="/quiz/:id/create-team" render={(props) => 
                <CreateTeamPage quizId={props.match.params.id} />
            } />
            <Route path="/team/:id/join-team" render={(props) => (
                <JoinTeamPage teamId={props.match.params.id} />
            )} />
            <Route path="/quiz/:id" render={(props) => (
                <QuizPage quizId={props.match.params.id} />
            )} />
            <Route path="/">
                <Home />
            </Route>
        </Switch>
    );
}