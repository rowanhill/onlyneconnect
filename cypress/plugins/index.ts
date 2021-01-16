/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
import * as admin from 'firebase-admin';
import firebase from 'firebase';
import { createQuiz } from '../../src/models/quiz';
import { createTeam, joinPlayerToTeam } from '../../src/models/team';
const cypressFirebasePlugin = require('cypress-firebase').plugin;

const config: Cypress.PluginConfig = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  config = cypressFirebasePlugin(on, config, admin);

  on('task', {
    createQuiz({ quizName, passcode, ownerId }) {
      return createQuiz(
        quizName,
        passcode,
        ownerId,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
      );
    },

    createTeam({ quizId, quizPasscode, teamName, teamPasscode, captainId }) {
      return createTeam(
        quizId,
        quizPasscode,
        teamName,
        teamPasscode,
        captainId,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
      );
    },

    joinPlayerToTeam({ playerId, teamId, teamPasscode }) {
      return joinPlayerToTeam(
        playerId,
        teamId,
        teamPasscode,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
      );
    },
  });

  return config;
};

export default config;
