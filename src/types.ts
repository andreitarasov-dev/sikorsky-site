export interface SocialLink {
  label: string;
  url: string;
  /** Optional: set to true to open in same tab instead of new tab */
  sameTab?: boolean;
}

export interface FooterConfig {
  /** Copyright text, e.g. "© Your Name, b. 1990" */
  copyright: string;
  /** Optional decorative element after copyright */
  decoration?: string;
  /** Contact email address */
  email: string;
  /** Social media links */
  socials: SocialLink[];
}

export interface HeadTag {
  /** HTML tag name (e.g. "script", "link", "meta") */
  tag: string;
  /** Tag attributes as key-value pairs */
  attrs?: Record<string, string | number | boolean>;
  /** Optional inner content for tags like script or style */
  content?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface ThemeConfig {
  site: {
    /** Site owner's name - used in breadcrumbs and metadata */
    name: string;
    /** Domain without protocol, e.g. "your-site.com" */
    domain: string;
  };
  /** Path to logo image (relative to public folder) */
  logo: string;
  /** Logo alt text */
  logoAlt?: string;
  /** Footer configuration */
  footer: FooterConfig;
  /**
   * Firebase configuration.
   * If not provided, will use PUBLIC_FIREBASE_* environment variables.
   */
  firebase?: Partial<FirebaseConfig>;
  /**
   * Custom head tags to inject into the document head.
   * Useful for adding analytics scripts, custom meta tags, etc.
   */
  head?: HeadTag[];
}

export interface ResolvedThemeConfig extends ThemeConfig {
  logoAlt: string;
  head: HeadTag[];
}
