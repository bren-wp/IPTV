import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brendigo.iptv.tv',
  appName: 'IPTV for TV',
  webDir: 'dist',
  server: { androidScheme: 'https', iosScheme: 'capacitor' },
};

export default config;
