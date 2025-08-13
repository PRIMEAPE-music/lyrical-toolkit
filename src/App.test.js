import { render, screen } from '@testing-library/react';
import App from './App';

test('renders music banner', () => {
  render(<App />);
  const banner = screen.getByText(/check out my music/i);
  expect(banner).toBeInTheDocument();
});
