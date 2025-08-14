import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const heading = screen.getByText(/Lyrical-Toolkit/i);
  expect(heading).toBeInTheDocument();
  
jest.mock('jspdf', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());

test('renders the music banner text', () => {
  render(<App />);
  const musicBannerText = screen.getByText(/check out my music!/i);
  expect(musicBannerText).toBeInTheDocument();
});
