import { render } from '@testing-library/react';

jest.mock('jspdf', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());
import App from './App';

test('renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
