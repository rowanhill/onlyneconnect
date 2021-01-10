import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('shows a loading message followed by the sign in page', async () => {
  render(<App />);
  const loadingElement = screen.getByText(/loading.../i);
  expect(loadingElement).toBeInTheDocument();
  const signInHeader = await screen.findByText('Sign in with email');
  expect(signInHeader).toBeInTheDocument();
});
