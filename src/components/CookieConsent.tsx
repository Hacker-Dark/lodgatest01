import { useState, useEffect } from 'react';
import { Shield, Check, X, Award, Eye, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getConsentStatus, setConsentStatus, getTrackedEvents, initializeAnalytics } from '../lib/analytics';

interface CookieConsentProps {
  theme?: 'light' | 'dark';
}

export default function CookieConsent({ theme = 'light' }: CookieConsentProps) {
  const isDark = theme === 'dark';
  const [showBanner, setShowBanner] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const consent = getConsentStatus();
    if (consent === null) {
      setShowBanner(true);
    } else if (consent === 'accepted') {
      initializeAnalytics();
    }
  }, []);

  // Poll for tracked events so they update live in the sandbox debug view
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents([...getTrackedEvents()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = () => {
    setConsentStatus('accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    setConsentStatus('declined');
    setShowBanner(false);
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50"
          >
            <div className={`p-5 rounded-2xl border shadow-xl flex flex-col gap-4 ${
              isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA]' : 'bg-white border-zinc-200 text-zinc-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">Privacy & Analytics Consent</h4>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Lodga uses Google Analytics (GA4) to securely track page views, listing interest, search criteria, and checkout funnels. This helps optimize student leasing across FUTMINNA. No personal passwords or credentials are ever tracked.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-3 border-zinc-200/20">
                <button
                  onClick={handleDecline}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Decline Analytics
                </button>
                <button
                  onClick={handleAccept}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                    isDark ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-zinc-900 hover:bg-zinc-850 text-white'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Accept and Verify</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
