import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const heading = screen.getByText(/Lyrical-Toolkit/i);
  expect(heading).toBeInTheDocument();
});
