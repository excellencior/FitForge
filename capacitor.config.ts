import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitforge.app',
  appName: 'FitForge',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    keyboardResize: 'none',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  plugins: {
    // Splash screen disabled — the default Capacitor one looks bad
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
  },
};

export default config;
