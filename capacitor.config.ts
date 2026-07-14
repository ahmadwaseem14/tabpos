import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tabspos.app',
  appName: 'Tabs POS',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    url: 'http://192.168.0.101:3000',
    cleartext: true
  }
};

export default config;
