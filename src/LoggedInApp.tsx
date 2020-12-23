import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { Home } from './Home';
import { QuizLobby } from './QuizLobby';
import { TeamLobby } from './TeamLobby';

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
            <Route path="/quiz/:id/lobby" render={(match) => 
                <QuizLobby quizId={match.match.params.id} />
            } />
            <Route path="/team/:id/lobby">{(match) => (
                <TeamLobby teamId={match.match?.params.id} />
            )}</Route>
            <Route path="/quiz/:id">
                {(match) => <p>Quiz ID: {match.match?.params.id}</p>}
            </Route>
            <Route path="/">
                <Home />
            </Route>
        </Switch>
    );
}