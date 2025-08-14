import { render, screen } from '@testing-library/react';
import App from './App';


test('renders app component', () => {
  render(<App />);
  const header = screen.getByText(/check out my music/i);
  expect(header).toBeInTheDocument();
=======
jest.mock('jspdf', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());

test('renders the music banner text', () => {
  render(<App />);
  const musicBannerText = screen.getByText(/check out my music!/i);
  expect(musicBannerText).toBeInTheDocument();
});
