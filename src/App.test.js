import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app component', () => {
  render(<App />);
  const header = screen.getByText(/check out my music/i);
  expect(header).toBeInTheDocument();
});
