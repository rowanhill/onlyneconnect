// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom doesn't include a crypto implementation, but Zoom SDK requires it
import { Crypto } from '@peculiar/webcrypto';
global.crypto = new Crypto();