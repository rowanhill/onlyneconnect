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
import { closeLastClue, createConnectionOrSequenceQuestion, createMissingVowelsQuestion, createQuiz, revealNextClue, revealNextQuestion } from '../../src/models/quiz';
import { submitAnswer, updateAnswers } from '../../src/models/answer';
import { createTeam, joinPlayerToTeam } from '../../src/models/team';
const cypressFirebasePlugin = require('cypress-firebase').plugin;

export interface CreateConnectionOrSequenceQuestionResult {
  questionId: string;
  clueIds: string[];
}

export interface CreateMissingVowelsQuestionResult {
  questionId: string;
  clueId: string;
}

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

    createConnectionOrSequenceQuestion({ quizId, question }) {
      return createConnectionOrSequenceQuestion(
        quizId,
        question,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.arrayUnion as unknown as typeof firebase.firestore.FieldValue.arrayUnion,
      );
    },

    createMissingVowelsQuestion({ quizId, question }) {
      return createMissingVowelsQuestion(
        quizId,
        question,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.arrayUnion,
      );
    },

    revealNextClue({ quizId, nextClueId, currentClueId }) {
      return revealNextClue(
        quizId,
        nextClueId,
        currentClueId,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.serverTimestamp as unknown as typeof firebase.firestore.FieldValue.serverTimestamp,
      );
    },

    revealNextQuestion({ quizId, nextQuestionId, currentClueId }) {
      return revealNextQuestion(
        quizId,
        nextQuestionId,
        currentClueId,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.serverTimestamp,
      );
    },

    closeLastClue({ quizId, currentClueId }) {
      return closeLastClue(
        quizId,
        currentClueId,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.serverTimestamp,
      );
    },

    submitAnswer({ quizId, questionId, clueId, teamId, text }) {
      return submitAnswer(
        quizId,
        questionId,
        clueId,
        teamId,
        text,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.serverTimestamp,
      );
    },

    updateAnswers({ quizId, answerUpdates }) {
      return updateAnswers(
        quizId,
        answerUpdates,
        admin.app().firestore() as unknown as firebase.firestore.Firestore,
        admin.firestore.FieldValue.increment,
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
