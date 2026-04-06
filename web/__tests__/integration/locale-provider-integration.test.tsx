/**
 * Integration test for LocaleProvider in application root
 * Verifies that the application renders correctly with LocaleProvider integrated
 */

import { render, waitFor } from '@testing-library/react';
import ThemeProvider from '@/app/components/providers/ThemeProvider';
import LocaleProvider from '@/app/components/providers/LocaleProvider';

// Mock next-intl
jest.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="intl-provider">{children}</div>,
}));

// Mock the i18n module
jest.mock('@/i18n', () => ({
  getLocaleFromStorage: jest.fn(() => 'en'),
  defaultLocale: 'en',
  locales: ['en', 'am'],
}));

// Mock the translation files
jest.mock('@/messages/en.json', () => ({
  default: {
    common: { appName: 'Shop Ops' },
    navigation: { dashboard: 'Dashboard' },
  },
}));

jest.mock('@/messages/am.json', () => ({
  default: {
    common: { appName: 'ሾፕ ኦፕስ' },
    navigation: { dashboard: 'ዳሽቦርድ' },
  },
}));

describe('LocaleProvider Integration', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'en'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('should render application with LocaleProvider integrated', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <LocaleProvider>
          <div data-testid="test-content">Test Content</div>
        </LocaleProvider>
      </ThemeProvider>
    );

    // Wait for LocaleProvider to load messages and render
    await waitFor(() => {
      expect(getByTestId('intl-provider')).toBeInTheDocument();
    });

    expect(getByTestId('test-content')).toBeInTheDocument();
  });

  it('should wrap children with ThemeProvider and LocaleProvider', async () => {
    const { container, getByTestId } = render(
      <ThemeProvider>
        <LocaleProvider>
          <main className="flex-1">
            <div data-testid="test-content">Test Content</div>
          </main>
        </LocaleProvider>
      </ThemeProvider>
    );

    // Wait for LocaleProvider to load messages and render
    await waitFor(() => {
      expect(getByTestId('intl-provider')).toBeInTheDocument();
    });

    // Verify the structure is correct
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main).toHaveClass('flex-1');
  });

  it('should load messages and initialize NextIntlClientProvider', async () => {
    const { getByTestId } = render(
      <LocaleProvider>
        <div data-testid="test-content">Test Content</div>
      </LocaleProvider>
    );

    // Wait for messages to load
    await waitFor(() => {
      expect(getByTestId('intl-provider')).toBeInTheDocument();
    });

    // Verify content is rendered inside the provider
    expect(getByTestId('test-content')).toBeInTheDocument();
  });
});
