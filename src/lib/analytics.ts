// Lodga Compliance & Analytics Utility
// Track: page views, listing views, search queries, checkout funnel drop-off points, and session duration.
// In mobile context (React Native), use a similar consent prompt on first launch and initialize Firebase Analytics if consent is given.
// Do not track anything before consent is given.

export interface TrackingEvent {
  event: string;
  params: Record<string, any>;
  timestamp: string;
}

const CONSENT_KEY = 'lodga-cookie-consent';
const SESSION_START_KEY = 'lodga-session-start';

export function getConsentStatus(): 'accepted' | 'declined' | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'accepted') return 'accepted';
  if (val === 'declined') return 'declined';
  return null;
}

export function setConsentStatus(status: 'accepted' | 'declined'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, status);
  if (status === 'accepted') {
    initializeAnalytics();
  }
}

// Real-time tracking events storage for debug visual tracking
export function getTrackedEvents(): TrackingEvent[] {
  if (typeof window === 'undefined') return [];
  return (window as any)._lodga_analytics_events || [];
}

export function initializeAnalytics() {
  if (typeof window === 'undefined') return;
  const consent = getConsentStatus();
  if (consent !== 'accepted') {
    console.log('[Analytics] Initialization blocked: No consent granted.');
    return;
  }

  // 1. Initialize Google Analytics (GA4) Tag for Web
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-LODGA2026';
  
  if (!document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(inlineScript);
    console.log(`[Analytics] GA4 Initialized with ID: ${gaId}`);
  }

  // Set session start time if not set
  if (!sessionStorage.getItem(SESSION_START_KEY)) {
    sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
  }

  // Hook session duration tracking
  trackEvent('session_start', { timestamp: Date.now() });
}

export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  
  const consent = getConsentStatus();
  if (consent !== 'accepted') {
    // Suppress tracking completely if consent is not granted or pending
    return;
  }

  const timestamp = new Date().toISOString();
  const event: TrackingEvent = { event: eventName, params, timestamp };

  // Append to global window container for immediate sandbox feedback
  (window as any)._lodga_analytics_events = (window as any)._lodga_analytics_events || [];
  (window as any)._lodga_analytics_events.push(event);

  // Send to standard Gtag if initialized
  if ((window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }

  console.log(`[Analytics EVENT] ${eventName}:`, params);
}

// Track page view
export function trackPageView(screenName: string) {
  trackEvent('page_view', { screen_name: screenName });
}

// Track listing view
export function trackListingView(propertyId: string, zone: string, price: number) {
  trackEvent('view_listing', { property_id: propertyId, zone, price });
}

// Track search queries
export function trackSearchQuery(filters: { zone?: string; type?: string; maxPrice?: number }) {
  trackEvent('search_query', filters);
}

// Track checkout funnel drop-off points
export function trackCheckoutStep(step: number, action: 'enter' | 'complete' | 'abandon') {
  trackEvent('checkout_funnel', { step, action, step_name: getStepName(step) });
}

function getStepName(step: number): string {
  switch (step) {
    case 1: return 'Review Details';
    case 2: return 'Caretaker Contact';
    case 3: return 'Naira Escrow Payment';
    case 4: return 'Unlock Verification PIN';
    default: return 'Unknown Step';
  }
}

// Calculate session duration in seconds
export function getSessionDuration(): number {
  if (typeof window === 'undefined') return 0;
  const start = sessionStorage.getItem(SESSION_START_KEY);
  if (!start) return 0;
  return Math.floor((Date.now() - parseInt(start)) / 1000);
}

export function trackSessionDuration() {
  const duration = getSessionDuration();
  if (duration > 0) {
    trackEvent('session_duration', { duration_seconds: duration });
  }
}

/**
 * Mobile Native Mock Analytics (React Native equivalent)
 * Demonstrates compliance for the mobile context mentioned in the requirement.
 */
export const MobileNativeAnalytics = {
  getConsent: async () => {
    // In React Native: AsyncStorage.getItem('@mobile_consent')
    return getConsentStatus();
  },
  setConsent: async (status: 'accepted' | 'declined') => {
    // In React Native: AsyncStorage.setItem('@mobile_consent', status)
    setConsentStatus(status);
  },
  trackEvent: (eventName: string, params: Record<string, any> = {}) => {
    console.log(`[Mobile Native Analytics] ${eventName}:`, params);
    // In React Native: if (consentGranted) firebase.analytics().logEvent(eventName, params);
  }
};
