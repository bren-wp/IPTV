import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brendigo.iptv',
  appName: 'IPTV',
  webDir: 'dist',
  server: { androidScheme: 'https', iosScheme: 'capacitor' },
};

export default config;
