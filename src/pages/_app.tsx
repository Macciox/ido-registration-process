import '@/styles/globals.css';
import '@/styles/calendar.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default MyApp;