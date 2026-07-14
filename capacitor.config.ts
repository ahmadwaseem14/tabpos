import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tabspos.app',
  appName: 'Tabs POS',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    // Replace with your Vercel URL after deployment, e.g.:
    // url: 'https://your-app.vercel.app',
    url: 'https://tabpos-weld.vercel.app',
    cleartext: false
  }
};

export default config;

