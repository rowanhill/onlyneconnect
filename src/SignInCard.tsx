import { FormEvent, useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import firebase from './firebase';

export const SignInCard = () => {
    const [email, setEmail] = useState('');
    const [disabled, setDisabled] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [hasSignedIn, setHasSignedIn] = useState(false);

    useEffect(() => {
        if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
            // Additional state parameters can also be passed via URL.
            // This can be used to continue the user's intended action before triggering
            // the sign-in operation.
            // Get the email if available. This should be available if the user completes
            // the flow on the same device where they started it.
            let storedEmail = window.localStorage.getItem('emailForSignIn');
            if (!storedEmail) {
                // User opened the link on a different device. To prevent session fixation
                // attacks, ask the user to provide the associated email again. For example:
                storedEmail = window.prompt('Please provide your email for confirmation');
            }
            // The client SDK will parse the code from the link for you.
            firebase.auth().signInWithEmailLink(storedEmail!, window.location.href)
                .then(function(result) {
                    // Clear email from storage.
                    window.localStorage.removeItem('emailForSignIn');
                    setHasSignedIn(true);
                    // You can access the new user via result.user
                    // Additional user info profile not available via:
                    // result.additionalUserInfo.profile == null
                    // You can check if the user is new or existing:
                    // result.additionalUserInfo.isNewUser
                })
                .catch(function(error) {
                    // Some error occurred, you can inspect the code: error.code
                    // Common errors could be invalid email and invalid or expired OTPs.
                    console.warn(error);
                });
        }
    });

    if (hasSignedIn) {
        const redirectPath = window.localStorage.getItem('sign-in-redirect') || '/';
        return <Redirect to={redirectPath} />
    }

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);
        const actionCodeSettings = {
            // URL you want to redirect back to. The domain (www.example.com) for this
            // URL must be in the authorized domains list in the Firebase Console.
            url: new URL("/sign-in", document.baseURI).href,
            // This must be true.
            handleCodeInApp: true,
        };
        firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
            .then(function() {
                // The link was successfully sent. Inform the user.
                // Save the email locally so you don't need to ask the user for it again
                // if they open the link on the same device.
                window.localStorage.setItem('emailForSignIn', email);
                setEmailSent(true);
            })
            .catch(function(error) {
                // Some error occurred, you can inspect the code: error.code
                console.warn(error);
            });
    };

    return (
        <div>
            <form onSubmit={submit}>
                <fieldset disabled={disabled}>
                    <h1>Sign in with email</h1>
                    <p>You must sign in to play Onlyne Connect. Enter your email, and we'll send you a login link.</p>
                    <input type="text" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <button>Log in</button>
                </fieldset>
            </form>
            {emailSent && <p>An email has been sent to {email}</p>}
        </div>
    );
};