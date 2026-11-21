import { isPlatform, getPlatforms, testUserAgent } from './platform';

describe('platform utilities', () => {
  describe('testUserAgent', () => {
    it('should match iOS user agent', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      } as Window;

      expect(testUserAgent(win, /iPhone/i)).toBe(true);
      expect(testUserAgent(win, /Android/i)).toBe(false);
    });

    it('should match Android user agent', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
        },
      } as Window;

      expect(testUserAgent(win, /Android/i)).toBe(true);
      expect(testUserAgent(win, /iPhone/i)).toBe(false);
    });

    it('should match desktop user agent', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      } as Window;

      expect(testUserAgent(win, /Windows/i)).toBe(true);
      expect(testUserAgent(win, /iPhone|Android/i)).toBe(false);
    });
  });

  describe('getPlatforms', () => {
    it('should detect iPhone platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('iphone');
      expect(platforms).toContain('ios');
      expect(platforms).toContain('mobile');
      expect(platforms).toContain('mobileweb');
    });

    it('should detect iPad platform (iOS 12 and below)', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('ipad');
      expect(platforms).toContain('ios');
      expect(platforms).toContain('tablet');
    });

    it('should detect iPad platform (iOS 13+)', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        innerWidth: 768,
        innerHeight: 1024,
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('ipad');
      expect(platforms).toContain('ios');
      expect(platforms).toContain('tablet');
    });

    it('should detect Android phone platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 Mobile',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('android');
      expect(platforms).toContain('mobile');
    });

    it('should detect Android tablet platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-T870) AppleWebKit/537.36',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        innerWidth: 800,
        innerHeight: 1280,
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('android');
      expect(platforms).toContain('tablet');
    });

    it('should detect desktop platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        matchMedia: (_query: string) => ({ matches: false }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('desktop');
      expect(platforms).not.toContain('mobile');
    });

    it('should detect PWA mode', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        matchMedia: (query: string) => {
          if (query === '(display-mode: standalone)') {
            return { matches: true };
          }
          return { matches: query === '(any-pointer:coarse)' };
        },
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('pwa');
    });

    it('should detect Cordova platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        cordova: {},
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('cordova');
      expect(platforms).toContain('hybrid');
      expect(platforms).not.toContain('mobileweb');
    });

    it('should detect Capacitor platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        Capacitor: {
          isNative: true,
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('capacitor');
      expect(platforms).toContain('hybrid');
    });

    it('should detect Electron platform', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 Chrome/91.0.4472.124 Electron/13.1.7',
        },
        matchMedia: (_query: string) => ({ matches: false }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms = getPlatforms(win);

      expect(platforms).toContain('electron');
    });

    it('should cache platforms on subsequent calls', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        Ionic: {},
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      const platforms1 = getPlatforms(win);
      const platforms2 = getPlatforms(win);

      expect(platforms1).toBe(platforms2);
      expect(win.Ionic.platforms).toBe(platforms1);
    });
  });

  describe('isPlatform', () => {
    it('should return true for matching platform (window and string arguments)', () => {
      const win = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 Mobile',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      expect(isPlatform(win, 'android')).toBe(true);
      expect(isPlatform(win, 'ios')).toBe(false);
    });

    it('should handle mobile platform detection', () => {
      const mobileWin = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
        matchMedia: (query: string) => ({ matches: query === '(any-pointer:coarse)' }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      expect(isPlatform(mobileWin, 'mobile')).toBe(true);
      expect(isPlatform(mobileWin, 'desktop')).toBe(false);
    });

    it('should handle desktop platform detection', () => {
      const desktopWin = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        matchMedia: (_query: string) => ({ matches: false }),
        document: {
          documentElement: {
            classList: {
              add: vi.fn(),
            },
          },
        },
      } as any;

      expect(isPlatform(desktopWin, 'desktop')).toBe(true);
      expect(isPlatform(desktopWin, 'mobile')).toBe(false);
    });

    it('accepts a platform name as the only argument', () => {
      expect(typeof isPlatform('desktop')).toBe('boolean');
    });
  });

  describe('viewport platforms', () => {
    const windowAt = (innerWidth: number, innerHeight: number, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)') =>
      ({
        navigator: { userAgent },
        innerWidth,
        innerHeight,
        matchMedia: () => ({ matches: false }),
        document: {
          documentElement: {
            classList: { add: vi.fn() },
          },
        },
      }) as any;

    it('detects a phablet viewport', () => {
      expect(getPlatforms(windowAt(400, 700))).toContain('phablet');
    });

    it('does not treat the phablet lower bound as a phablet', () => {
      expect(getPlatforms(windowAt(390, 700))).not.toContain('phablet');
    });

    it('detects a tablet-sized viewport without iPad or Android', () => {
      expect(getPlatforms(windowAt(500, 900))).toContain('tablet');
    });

    it('does not treat a phone-sized viewport as a tablet', () => {
      expect(getPlatforms(windowAt(360, 640))).not.toContain('tablet');
    });
  });
});
