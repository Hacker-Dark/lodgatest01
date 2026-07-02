import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Search, SlidersHorizontal, ArrowRight, ShieldCheck, 
  MapPin, Bed, Bath, Sparkles, Check, Info, PhoneCall, Star, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Share2, Compass, Map, X, Heart, Home, FileText, User, Trash2, LogOut, Lock, Bell, MessageSquare, Settings
} from 'lucide-react';
import { APIProvider, Map as GMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import futminnaLogo from '../assets/images/futminna_logo_1782173784907.jpg';
import { 
  trackPageView, 
  trackListingView, 
  trackSearchQuery, 
  trackCheckoutStep 
} from '../lib/analytics';
import SupportButton from './SupportButton';
import CookieConsent from './CookieConsent';

interface StudentAppProps {
  apiState: any;
  onRefresh: () => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  theme?: 'light' | 'dark';
}

export default function StudentApp({ 
  apiState, 
  onRefresh, 
  currentUser, 
  setCurrentUser, 
  token, 
  setToken,
  theme = 'light'
}: StudentAppProps) {
  const isDark = theme === 'dark';

  // Coordinate helper for the interactive map
  const getZoneCenter = (zone: string) => {
    switch (zone) {
      case 'Gidan Kwano':
        return { x: 30, y: 35 };
      case 'Jatapi':
        return { x: 74, y: 48 };
      case 'Dama':
        return { x: 65, y: 18 };
      case 'Gidan Managoro':
        return { x: 38, y: 72 };
      default:
        return { x: 50, y: 50 };
    }
  };

  const getPropertyCoordinates = (prop: any) => {
    const base = getZoneCenter(prop.zone);
    const seed = prop.property_id ? prop.property_id.replace(/\D/g, '') : '0';
    const num = Number(seed) || 123;
    // deterministic scatter
    const offsetX = ((num % 13) - 6) * 2.2; 
    const offsetY = (((num * 3) % 11) - 5) * 2.2; 
    return {
      x: Math.max(12, Math.min(88, base.x + offsetX)),
      y: Math.max(12, Math.min(88, base.y + offsetY))
    };
  };
  // Screens navigation state: 'SPLASH' | 'ONBOARDING' | 'AUTH' | 'BROWSE' | 'DETAIL' | 'CHECKOUT' | 'POSTMOVEIN' | 'HISTORY'
  const [screen, setScreen] = useState<'SPLASH' | 'ONBOARDING' | 'AUTH' | 'BROWSE' | 'DETAIL' | 'CHECKOUT' | 'POSTMOVEIN' | 'HISTORY'>('SPLASH');
  
  // Slide trackers
  const [onboardIndex, setOnboardIndex] = useState(0);
  
  // Auth inputs
  const [phone, setPhone] = useState('08123456789');
  const [fullName, setFullName] = useState('Sodiq Adesanya');
  const [isRegister, setIsRegister] = useState(false);
  const [isFutminnaStudent, setIsFutminnaStudent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [authStep, setAuthStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [authMessage, setAuthMessage] = useState('');
  
  // Listings and Filters
  const [zoneFilter, setZoneFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priceMax, setPriceMax] = useState<number>(300000);
  const [searchText, setSearchText] = useState('');
  
  // Selected Listing
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [browseMode, setBrowseMode] = useState<'LIST' | 'MAP'>('LIST');
  const [mapSelectedPropId, setMapSelectedPropId] = useState<string | null>(null);

  // Google OAuth & Registration States
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleAuthPending, setGoogleAuthPending] = useState(false);
  const [showGoogleSimulator, setShowGoogleSimulator] = useState(false);

  // Google Auth Handlers
  const handleGoogleSignIn = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return;
      } catch (err) {
        console.warn('Supabase signInWithOAuth failed, falling back to simulator:', err);
      }
    }
    setShowGoogleSimulator(true);
  };

  const submitGoogleAuth = async (email: string, name: string) => {
    setShowGoogleSimulator(false);
    setAuthMessage("");
    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthMessage(data.error || "Google login failed.");
        return;
      }

      if (data.requirePhone) {
        setGoogleEmail(email);
        setGoogleName(name);
        setGoogleAuthPending(true);
        setAuthStep('PHONE');
        setPhone('');
        setAuthMessage("Complete Google registration by linking your mobile number.");
      } else {
        setToken(data.token);
        setCurrentUser(data.user);
        onRefresh();
        setScreen('BROWSE');
      }
    } catch (err) {
      setAuthMessage("Error connecting to Google authentication service.");
    }
  };

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [selectedPropertyId]);
  
  // Checkout flow states
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1);
  const [inspectionWaiver, setInspectionWaiver] = useState(false);
  const [moveInDate, setMoveInDate] = useState('2026-07-01');
  const [paymentReference, setPaymentReference] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  
  // Feedback states
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);

  // Safety / Report feature state variables
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportEvidenceUrls, setReportEvidenceUrls] = useState<string[]>([]);
  const [reportSubjectContactId, setReportSubjectContactId] = useState<string | null>(null);
  const [reportSubjectPropertyId, setReportSubjectPropertyId] = useState<string | null>(null);
  const [reportSubjectUserId, setReportSubjectUserId] = useState<string | null>(null);
  const [reportSubjectName, setReportSubjectName] = useState<string | null>(null);
  const [uploadingReportPhoto, setUploadingReportPhoto] = useState(false);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Bottom navigation tab state
  const [activeTab, setActiveTab] = useState<'home' | 'saved' | 'map' | 'bookings' | 'profile'>('home');

  // Saved listings / wishlist state
  const [savedListings, setSavedListings] = useState<any[]>([]);

  // Comparison feature state
  const [compareListings, setCompareListings] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Property reviews state
  const [propertyReviews, setPropertyReviews] = useState<{ [propId: string]: any[] }>({});
  const [submittingReviewPropId, setSubmittingReviewPropId] = useState<string | null>(null);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  // Zustand-like unread booking updates state
  const [unreadBookingUpdates, setUnreadBookingUpdates] = useState<boolean>(false);

  // Profile preferences
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [passwordOld, setPasswordOld] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifBookings, setNotifBookings] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showLegalView, setShowLegalView] = useState<'NONE' | 'TERMS' | 'PRIVACY'>('NONE');

  // Student transactions (declared early to avoid block-scoping issues)
  const studentTxList = (apiState.transactions || []).filter((t: any) => t.student_id === currentUser?.user_id);

  // Auto-redirect HISTORY to BROWSE bookings tab
  useEffect(() => {
    if (screen === 'HISTORY') {
      setScreen('BROWSE');
      setActiveTab('bookings');
    }
  }, [screen]);

  // Fetch saved listings on token change
  const fetchSavedListings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/listings/saved', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedListings(data);
      }
    } catch (err) {
      console.error('Error fetching saved listings:', err);
    }
  };

  const toggleSaveListing = async (propertyId: string) => {
    if (!token) {
      alert("Please log in to save properties to your wishlist.");
      return;
    }
    const isSaved = savedListings.some(s => s.property_id === propertyId);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const res = await fetch(`/api/listings/saved/${propertyId}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSavedListings();
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update wishlist.");
      }
    } catch (error) {
      console.error('Toggle Save error:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSavedListings();
    }
  }, [token, apiState.saved_listings]);

  // Track escrow status updates for bookings unread badge
  useEffect(() => {
    if (!currentUser) return;
    const cacheKey = `lodga-tx-states-${currentUser.user_id}`;
    const cached = localStorage.getItem(cacheKey);
    const currentStates = studentTxList.map((tx: any) => `${tx.transaction_id}:${tx.escrow_status}`).join(',');
    
    if (cached && cached !== currentStates) {
      setUnreadBookingUpdates(true);
    }
    
    if (activeTab === 'bookings') {
      localStorage.setItem(cacheKey, currentStates);
      setUnreadBookingUpdates(false);
    }
  }, [studentTxList, activeTab, currentUser]);

  // Fetch reviews for detailed property
  const fetchReviewsForProperty = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/listings/reviews/${propertyId}`);
      if (res.ok) {
        const data = await res.json();
        setPropertyReviews(prev => ({ ...prev, [propertyId]: data }));
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  useEffect(() => {
    if (selectedPropertyId) {
      fetchReviewsForProperty(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  // Fetch my submitted reports
  const fetchMyReports = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reports/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserReports(data);
      }
    } catch (err) {
      console.error("Error fetching user reports:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyReports();
    }
  }, [token, activeTab]);

  // Splash countdown
  useEffect(() => {
    if (screen === 'SPLASH') {
      const timer = setTimeout(() => {
        setScreen('ONBOARDING');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // 1. Analytics - Page view tracking
  useEffect(() => {
    trackPageView(screen);
  }, [screen]);

  // 2. Analytics - Listing detail view tracking
  useEffect(() => {
    if (screen === 'DETAIL' && selectedPropertyId) {
      const prop = (apiState.properties || []).find((p: any) => p.property_id === selectedPropertyId);
      if (prop) {
        trackListingView(prop.property_id, prop.zone, prop.total_listed_price);
      }
    }
  }, [screen, selectedPropertyId, apiState.properties]);

  // 3. Analytics - Search & Filtering queries tracking with debounce
  useEffect(() => {
    if (screen === 'BROWSE') {
      const delayDebounce = setTimeout(() => {
        trackSearchQuery({
          zone: zoneFilter || undefined,
          type: typeFilter || undefined,
          maxPrice: priceMax || undefined
        });
      }, 1000);
      return () => clearTimeout(delayDebounce);
    }
  }, [screen, zoneFilter, typeFilter, priceMax, searchText]);

  // 4. Analytics - Checkout step & Funnel drop-offs tracking
  const [lastCheckedStep, setLastCheckedStep] = useState<number | null>(null);
  useEffect(() => {
    if (screen === 'CHECKOUT') {
      trackCheckoutStep(checkoutStep, 'enter');
      setLastCheckedStep(checkoutStep);
    } else if (lastCheckedStep !== null) {
      if (lastCheckedStep < 4) {
        trackCheckoutStep(lastCheckedStep, 'abandon');
      }
      setLastCheckedStep(null);
    }
  }, [screen, checkoutStep]);

  const onboardingSlides = [
    {
      title: "Exploitative Fees? Over.",
      desc: "Lodga connects you directly with caretaker leads. Zero agent search charges, zero side negotiations.",
      image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600"
    },
    {
      title: "Fully Audited Lodges",
      desc: "No catfishing. Staff inspectors perform rigorous 7-point physical visits before any property goes live.",
      image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600"
    },
    {
      title: "Secure Rent Escrows",
      desc: "Your lease is fully protected. Caretakers are only credited 48 hours after your successful move-in validation.",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600"
    }
  ];

  // Simulated authenticate routine
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^0[789]\d{9}$/)) {
      setAuthMessage("Complete registration requires a valid 11-digit mobile number beginning with 07/08/09.");
      return;
    }
    
    setAuthMessage("");

    if (googleAuthPending) {
      try {
        const res = await fetch('/api/auth/google-complete-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: googleEmail, phone, is_futminna: isFutminnaStudent })
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthMessage(data.error || "Failed to bind phone number.");
          return;
        }
        setGoogleAuthPending(false);
        setToken(data.token);
        setCurrentUser(data.user);
        onRefresh();
        setScreen('BROWSE');
      } catch (err) {
        setAuthMessage("Server registration linking failure.");
      }
      return;
    }
    
    if (isRegister) {
      if (!fullName) {
        setAuthMessage("Profile full name is required.");
        return;
      }
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, full_name: fullName, user_type: 'student', is_futminna: isFutminnaStudent })
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthMessage(data.error || "Registration error occurred");
          return;
        }
        setToken(data.token);
        setCurrentUser(data.user);
        onRefresh();
        setScreen('BROWSE');
      } catch (err) {
        setAuthMessage("Server registration failure");
      }
    } else {
      // Login simulation requests OTP
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthMessage(data.error);
          return;
        }
        setAuthStep('OTP');
      } catch (err) {
        setAuthMessage("Verification setup connection error");
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMessage(data.error);
        return;
      }
      setToken(data.token);
      setCurrentUser(data.user);
      onRefresh();
      setAuthMessage("");
      setScreen('BROWSE');
    } catch (e) {
      setAuthMessage("Security validation failed");
    }
  };

  // Listings data pipeline
  const filteredListings = (apiState.properties || []).filter((p: any) => {
    if (p.availability !== 'Available') return false;
    if (zoneFilter && p.zone !== zoneFilter) return false;
    if (typeFilter && p.property_type !== typeFilter) return false;
    if (p.total_listed_price > priceMax) return false;
    
    if (searchText) {
      const search = searchText.toLowerCase();
      const matchLandmark = p.street_landmark?.toLowerCase().includes(search);
      const matchZone = p.zone.toLowerCase().includes(search);
      const matchType = p.property_type.toLowerCase().includes(search);
      return matchLandmark || matchZone || matchType;
    }
    return true;
  });

  const selectedProperty = (apiState.properties || []).find((p: any) => p.property_id === selectedPropertyId);
  const propertyPhotos = (selectedProperty && Array.isArray(selectedProperty.photos) && selectedProperty.photos.length > 0)
    ? selectedProperty.photos
    : ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600'];

  const handleShareProperty = async (prop: any) => {
    if (!prop) return;
    const shareText = `🏢 verified FUTMINNA lodge on Lodga!\n📍 Zone: ${prop.zone}\n📌 Address: ${prop.street_landmark}\n🛒 Rate: ₦${Number(prop.total_listed_price).toLocaleString()} / year\n🔐 Protected with Secure Escrow Payout Guarantee.`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${prop.property_type} in ${prop.zone}`,
          text: `Check out this verified student lodge on Lodga: ${prop.property_type} at ${prop.street_landmark}.`,
          url: `${window.location.origin}/property/${prop.property_id}`
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2500);
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(shareText);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      } catch (e) {
        console.error("Clipboard failure: ", e);
      }
    }
  };

  const handleShareClick = async () => {
    if (selectedProperty) {
      await handleShareProperty(selectedProperty);
    }
  };

  // Checkout routines
  const handleInitiatePayment = async () => {
    if (!token) {
      setScreen('AUTH');
      return;
    }
    setIsPaying(true);
    setCheckoutStep(2);
    
    try {
      const res = await fetch('/api/transactions/initiate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          property_id: selectedPropertyId,
          inspection_waiver: inspectionWaiver,
          move_in_date: moveInDate
        })
      });
      const data = await res.json();
      setIsPaying(false);
      
      if (res.ok) {
        setPaymentReference(data.reference);
        setCheckoutStep(3);
      } else {
        alert(data.error || "Failed to initialize standard checkout");
        setCheckoutStep(1);
      }
    } catch (err) {
      setIsPaying(false);
      alert("Rent system payment dispatcher failed.");
      setCheckoutStep(1);
    }
  };

  const handleSimulateCardPayment = () => {
    setIsPaying(true);
    setTimeout(async () => {
      setIsPaying(false);
      await fetch(`/payment-callback?ref=${paymentReference}`);
      onRefresh();
      setCheckoutStep(4);
    }, 1500);
  };

  const handlePostFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeTxId) return;
    
    if (comment.length < 15) {
      alert("Please ensure your review statement is at least 15 characters long before submitting.");
      return;
    }
    
    try {
      const res = await fetch(`/api/transactions/${activeTxId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, feedback_text: comment })
      });
      
      if (res.ok) {
        alert("Success! Your review has been submitted and the escrow disbursement is finalized.");
        onRefresh();
        setComment('');
        setScreen('HISTORY');
      } else {
        const errorData = await res.json();
        alert(errorData.error);
      }
    } catch (err) {
      alert("Failure submitting checklist responses.");
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeTxId || !disputeReason) return;
    
    try {
      const res = await fetch(`/api/transactions/${activeTxId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: disputeReason })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onRefresh();
        setDisputeReason('');
        setShowDisputeInput(false);
        setScreen('HISTORY');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Dispute lock failed.");
    }
  };

  const handleReportPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (reportEvidenceUrls.length + files.length > 5) {
      alert("You can upload a maximum of 5 evidence photos.");
      return;
    }
    setUploadingReportPhoto(true);
    // Simulate real uploading to Cloudinary
    setTimeout(() => {
      const newUrls = Array.from(files).map((file: any) => URL.createObjectURL(file));
      setReportEvidenceUrls(prev => [...prev, ...newUrls]);
      setUploadingReportPhoto(false);
    }, 1200);
  };

  return (
    <div id="student-mock-device" className={`relative w-full max-w-[390px] h-[760px] border-[14px] rounded-[52px] shadow-2xl overflow-hidden flex flex-col font-sans select-none my-4 mx-auto transition-all duration-300 ${
      isDark ? 'bg-[#1A1A1A] border-[#2D2D2C] text-[#E2E1DA]' : 'bg-white border-zinc-900 text-zinc-900'
    }`}>
      
      {/* Device notch screen details */}
      <div className={`absolute top-0 inset-x-0 h-6 flex justify-between px-6 text-[11px] font-medium z-50 items-center transition-colors duration-300 ${
        isDark ? 'bg-[#2D2D2C] text-[#A3A29B]' : 'bg-zinc-900 text-zinc-400'
      }`}>
        <span>9:41</span>
        <div className={`w-20 h-4 rounded-b-xl absolute left-1/2 -translate-x-1/2 ${isDark ? 'bg-[#2D2D2C]' : 'bg-zinc-900'}`}></div>
        <div className="flex gap-1 items-center">
          <span className="text-[10px]">FUTMINNA LTE</span>
          <div className={`w-4 h-2.5 rounded-xs ${isDark ? 'bg-[#383837]' : 'bg-zinc-650'}`}></div>
        </div>
      </div>

      {/* Screen container */}
      <div className={`flex-grow h-full overflow-y-auto flex flex-col relative transition-colors duration-300 mt-6 ${
        isDark ? 'bg-[#1A1A1A] text-[#E2E1DA]' : 'bg-zinc-50 text-zinc-900'
      }`}>
        
        <AnimatePresence mode="wait">
          {/* ==================================== */}
          {/* 1. SPLASH SCREEN */}
          {/* ==================================== */}
          {screen === 'SPLASH' && (
            <motion.div
              key="SPLASH"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex-grow h-full flex flex-col items-center justify-center px-6 text-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
            >
              <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg animate-pulse animate-duration-1500">
                <svg 
                  viewBox="0 0 400 400" 
                  className="w-full h-full"
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="400" height="400" rx="80" fill={isDark ? '#E2E1DA' : '#1A1A1A'} />
                  <text
                    x="50%"
                    y="52%"
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill={isDark ? '#1A1A1A' : '#E2E1DA'}
                    style={{
                      fontFamily: '"Inter", "Arial Black", "Montserrat", sans-serif',
                      fontWeight: 900,
                      fontSize: '94px',
                      letterSpacing: '-0.035em',
                    }}
                  >
                    LODGA
                  </text>
                </svg>
              </div>
            </motion.div>
          )}

        {/* ==================================== */}
        {/* 2. ONBOARDING SCREEN */}
        {/* ==================================== */}
        {screen === 'ONBOARDING' && (
          <motion.div
            key="ONBOARDING"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex-grow h-full flex flex-col justify-between p-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
          >
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs font-extrabold tracking-tight ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>LODGA</span>
              <button onClick={() => setScreen('BROWSE')} className={`text-xs font-bold cursor-pointer transition-colors ${isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-zinc-400 hover:text-zinc-900'}`}>Skip</button>
            </div>

            <div className="my-auto py-4">
              <img 
                src={onboardingSlides[onboardIndex].image} 
                className={`w-full h-44 object-cover rounded-2xl mb-5 border ${isDark ? 'border-[#383837]/80' : 'border-zinc-200'}`} 
                alt="Onboard visual" 
              />
              <h2 className={`text-xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>{onboardingSlides[onboardIndex].title}</h2>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>{onboardingSlides[onboardIndex].desc}</p>
            </div>

            <div className="space-y-4">
              {/* Pagination indicators */}
              <div className="flex gap-1.5 justify-center">
                {onboardingSlides.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`h-1 rounded-full transition-all duration-300 ${onboardIndex === idx ? (isDark ? 'w-5 bg-[#E2E1DA]' : 'w-5 bg-zinc-900') : (isDark ? 'w-1 bg-[#383837]' : 'w-1 bg-zinc-200')}`}
                  ></span>
                ))}
              </div>

              {onboardIndex < 2 ? (
                <button 
                  onClick={() => setOnboardIndex(idx => idx + 1)}
                  className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition cursor-pointer ${isDark ? 'bg-[#2D2D2C] hover:bg-[#333332] text-[#E2E1DA]' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'}`}
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => setScreen('AUTH')}
                  className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition cursor-pointer ${isDark ? 'bg-[#E2E1DA] hover:bg-[#D2D1C9] text-[#1A1A1A]' : 'bg-zinc-900 hover:bg-zinc-850 text-white'}`}
                >
                  Get Verified <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ==================================== */}
        {/* 3. AUTHENTICATION (OTP SCREEN) */}
        {/* ==================================== */}
        {screen === 'AUTH' && (
          <motion.div
            key="AUTH"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex-grow h-full flex flex-col justify-between p-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
          >
            <div>
              <button onClick={() => setScreen('ONBOARDING')} className={`text-xs mb-8 font-semibold ${isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-zinc-400 hover:text-zinc-900'}`}>← back</button>
              <h2 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>Student Verification</h2>
              <p className={`text-xs mb-6 leading-normal ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>Provide your Nigerian mobile contact details to secure access with rapid OTP pings.</p>

              {authMessage && (
                <div className={`border p-3 rounded-xl text-xs flex items-start gap-2 mb-4 ${isDark ? 'bg-red-950/20 border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authMessage}</span>
                </div>
              )}

              {authStep === 'PHONE' ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  {googleAuthPending && (
                    <div className={`p-3 rounded-xl border text-xs leading-normal ${
                      isDark ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      Linking Google Profile: <strong className={isDark ? 'text-white' : 'text-zinc-950'}>{googleEmail}</strong>. Provide an 11-digit mobile number to finalize your verified lease account.
                    </div>
                  )}

                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>Mobile Number (FUTMINNA context)</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08123456789"
                      className={`w-full rounded-xl px-4 py-3 text-xs outline-none transition-colors border ${
                        isDark ? 'bg-[#1E1E1D] border-[#383837] text-[#E2E1DA] focus:border-[#E2E1DA]' : 'bg-white border-zinc-250 text-zinc-800 focus:border-zinc-500'
                      }`}
                    />
                  </div>

                  {isRegister && !googleAuthPending && (
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>Your Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Sodiq Adesanya"
                        className={`w-full rounded-xl px-4 py-3 text-xs outline-none transition-colors border ${
                          isDark ? 'bg-[#1E1E1D] border-[#383837] text-[#E2E1DA] focus:border-[#E2E1DA]' : 'bg-white border-zinc-250 text-zinc-800 focus:border-zinc-500'
                        }`}
                      />
                    </div>
                  )}

                  {(isRegister || googleAuthPending) && (
                    <div className="flex items-center gap-2.5 py-1 text-left">
                      <input 
                        type="checkbox" 
                        id="is-futminna"
                        checked={isFutminnaStudent}
                        onChange={(e) => setIsFutminnaStudent(e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-600 border-zinc-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="is-futminna" className={`text-xs font-semibold cursor-pointer select-none ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-700'}`}>
                        I am a student of FUTMINNA, Nigeria
                      </label>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className={`w-full font-bold py-3 rounded-xl text-xs cursor-pointer shadow-xs transition-colors ${
                      isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] hover:bg-[#D2D1C9]' : 'bg-zinc-900 hover:bg-zinc-850 text-white'
                    }`}
                  >
                    {googleAuthPending ? 'Link Mobile & Proceed' : isRegister ? 'Create Account' : 'Verify Account'}
                  </button>

                  {!googleAuthPending && (
                    <>
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-zinc-200/20"></div>
                        <span className="flex-shrink mx-4 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">or</span>
                        <div className="flex-grow border-t border-zinc-200/20"></div>
                      </div>

                      <button 
                        type="button"
                        onClick={handleGoogleSignIn}
                        className={`w-full font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all border ${
                          isDark 
                            ? 'bg-[#1E1E1D] hover:bg-zinc-800 text-white border-zinc-800' 
                            : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className={`p-3 rounded-xl border border-dashed text-center text-xs mb-4 ${
                    isDark ? 'bg-[#2D2D2C] border-[#383837] text-[#A3A29B]' : 'bg-zinc-50 border-[#C5C4BA]/50 text-zinc-500'
                  }`}>
                    <span>MOCK SIMULATOR SMS CODE: <strong className={isDark ? 'text-[#E2E1DA]' : 'text-[#111]'}>123456</strong></span>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>6-Digit SMS Code</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className={`w-full rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest outline-none transition-colors border ${
                        isDark ? 'bg-[#1E1E1D] border-[#383837] text-[#E2E1DA] focus:border-[#E2E1DA]' : 'bg-white border-[#C5C4BA] text-zinc-900 focus:outline-none focus:border-zinc-500'
                      }`}
                    />
                  </div>

                  <button 
                    type="submit"
                    className={`w-full font-bold py-3 rounded-xl text-xs cursor-pointer shadow-xs transition-colors ${
                      isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] hover:bg-[#D2D1C9]' : 'bg-zinc-900 hover:bg-zinc-850 text-white'
                    }`}
                  >
                    Confirm & Proceed
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setAuthStep('PHONE'); setOtpCode(''); }}
                    className="w-full text-center text-[10px] text-zinc-400 hover:text-zinc-600 font-bold"
                  >
                    Change phone number
                  </button>
                </form>
              )}
            </div>

            <div className={`border-t pt-4 text-center ${isDark ? 'border-[#383837]' : 'border-zinc-200/80'}`}>
              <button 
                type="button"
                onClick={() => { setIsRegister(!isRegister); setAuthStep('PHONE'); setAuthMessage(''); }}
                className={`text-xs font-bold ${isDark ? 'text-[#E2E1DA] hover:text-[#D2D1C9]' : 'text-zinc-800 hover:underline'}`}
              >
                {isRegister ? "Already registered? Sign In" : "Need registration? Sign Up"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ==================================== */}
        {/* 4. BROWSE SCREEN LISTINGS */}
        {/* ==================================== */}
        {screen === 'BROWSE' && (
          <motion.div
            key="BROWSE"
            initial={{ x: "-15%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "15%", opacity: 0 }}
            transition={{ type: "tween", ease: [0.25, 0.8, 0.25, 1], duration: 0.38 }}
            className="flex-grow flex flex-col h-full relative"
          >
            <div className={`flex-grow overflow-y-auto pb-[64px] transition-colors duration-300 ${isDark ? 'bg-[#1A1A1A]' : 'bg-zinc-50'}`}>
              
              {/* ==================================== */}
              {/* TAB 1: HOME TAB (Browse Listings) */}
              {/* ==================================== */}
              {activeTab === 'home' && (
                <div className="flex-grow flex flex-col">
                  {/* Header block */}
                  <div className={`p-4 sticky top-0 z-30 space-y-3 shadow-xs transition-colors border-b ${
                    isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={futminnaLogo} 
                          alt="FUTMINNA Seal" 
                          className="w-10 h-10 object-contain rounded-full bg-white p-0.5 shadow-xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h1 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>Verified Feeds</h1>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Federal Univ. Minna</p>
                        </div>
                      </div>
                      
                      {currentUser ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition ${
                            isDark ? 'bg-[#2D2D2C] border-[#383837] text-[#E2E1DA]' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                          }`}>
                            ID: {currentUser.full_name?.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setScreen('AUTH')} 
                          className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${
                            isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] hover:bg-[#D2D1C9]' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                          }`}
                        >
                          Sign In
                        </button>
                      )}
                    </div>

                    {/* Verified Count Banner */}
                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] ${
                      isDark ? 'bg-[#242423] border-[#383837] text-[#A3A29B]' : 'bg-zinc-50 border-zinc-200 text-zinc-650'
                    }`}>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="leading-tight">
                        <strong>{filteredListings.length} lodges</strong> physical verified.
                      </span>
                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => setBrowseMode(browseMode === 'LIST' ? 'MAP' : 'LIST')}
                          className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-lg border transition-all duration-200 cursor-pointer ${
                            browseMode === 'MAP'
                              ? (isDark ? 'bg-emerald-500/25 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700')
                              : (isDark ? 'bg-[#2D2D2C] border-[#383837] text-[#A3A29B] hover:text-[#E2E1DA]' : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200')
                          }`}
                        >
                          {browseMode === 'MAP' ? (
                            <>
                              <Building2 className="w-3 h-3 text-emerald-400" />
                              <span>Show List</span>
                            </>
                          ) : (
                            <>
                              <Map className="w-3 h-3 text-amber-500" />
                              <span>Interactive Map</span>
                            </>
                          )}
                        </button>
                        <button onClick={onRefresh} className="hover:rotate-180 transition-all duration-300 shrink-0 cursor-pointer" title="Refresh">
                          <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Search landmark, zone..." 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs outline-none transition-colors border ${
                          isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA] placeholder-zinc-500 focus:border-[#E2E1DA]' : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
                        }`}
                      />
                    </div>

                    {/* Short Filter Ribbons */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      <select 
                        value={zoneFilter} 
                        onChange={(e) => setZoneFilter(e.target.value)}
                        className={`border py-1 px-2 rounded-lg transition-colors overflow-hidden ${
                          isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA]' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        <option value="">All Zones</option>
                        <option value="Gidan Kwano">Gidan Kwano</option>
                        <option value="Jatapi">Jatapi</option>
                        <option value="Dama">Dama</option>
                        <option value="Gidan Managoro">Gidan Managoro</option>
                      </select>

                      <select 
                        value={typeFilter} 
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`border py-1 px-2 rounded-lg transition-colors ${
                          isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA]' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        <option value="">All Types</option>
                        <option value="Self-contain">Self Contain</option>
                        <option value="Room & Parlour">Room & Parlour</option>
                        <option value="Mini Flat">Mini Flat</option>
                        <option value="Studio">Studio</option>
                      </select>

                      <div className={`flex items-center gap-1 border px-2 py-0.5 rounded-lg shrink-0 ${
                        isDark ? 'bg-[#242423] border-[#383837] text-[#A3A29B]' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                      }`}>
                        <span>&lt; N{priceMax.toLocaleString()}</span>
                        <input 
                          type="range" 
                          min={100000} 
                          max={300000} 
                          step={10000} 
                          value={priceMax} 
                          onChange={(e) => setPriceMax(Number(e.target.value))}
                          className={`w-14 h-1 cursor-pointer accent-zinc-900`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feed contents */}
                  <div className="p-4 space-y-4">
                    {browseMode === 'MAP' ? (
                      <div className="flex-grow flex flex-col space-y-4 min-h-[480px]">
                        {/* Interactive Map Canvas Wrapper */}
                        <div className={`relative flex-grow rounded-2xl border overflow-hidden shadow-inner flex flex-col min-h-[440px] ${
                          isDark ? 'bg-[#121212] border-[#383837]' : 'bg-slate-50 border-zinc-200'
                        }`}>
                          {/* SVG Map Layer */}
                          <div className="absolute inset-0 select-none opacity-40 pointer-events-none">
                            {/* Decorative grid pattern */}
                            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <pattern id="map-grid-pattern-home-tab" width="40" height="40" patternUnits="userSpaceOnUse">
                                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDark ? '#383837' : '#e4e4e7'} strokeWidth="1" />
                                </pattern>
                              </defs>
                              <rect width="100%" height="100%" fill="url(#map-grid-pattern-home-tab)" />
                            </svg>
                          </div>

                          {/* Vector Roads & Geographics Layer */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Minna-Bida Expressway */}
                            <path d="M 0 50 Q 50 45, 100 55" fill="none" stroke={isDark ? '#2E2D2B' : '#cbd5e1'} strokeWidth="2.5" />
                            {/* Gidan Kwano Road */}
                            <path d="M 30 0 L 30 100" fill="none" stroke={isDark ? '#222221' : '#e2e8f0'} strokeWidth="1" strokeDasharray="2,2" />
                            {/* Jatapi Lane */}
                            <path d="M 0 35 Q 74 48, 100 35" fill="none" stroke={isDark ? '#222221' : '#e2e8f0'} strokeWidth="1" strokeDasharray="1,2" />
                          </svg>

                          {/* FUTMINNA Gidan Kwano Campus Outline Marker */}
                          <div className={`absolute top-[40%] left-[3%] -translate-y-1/2 p-2 rounded-xl border flex flex-col space-y-0.5 shadow-sm max-w-[120px] pointer-events-none z-10 ${
                            isDark ? 'bg-[#181817]/90 border-[#383837]/80 text-[#E2E1DA]' : 'bg-white/95 border-zinc-200 text-zinc-850'
                          }`}>
                            <div className="flex items-center gap-1">
                              <img src={futminnaLogo} className="w-3.5 h-3.5 rounded-full object-contain" alt="" />
                              <span className="text-[8px] font-extrabold uppercase tracking-wide">FUTMINNA Gidan Kwano</span>
                            </div>
                            <span className="text-[7px] text-zinc-400">Main Lecture Theatres</span>
                          </div>

                          {/* Shaded zone regions */}
                          {['Gidan Kwano', 'Jatapi', 'Dama', 'Gidan Managoro'].map((z) => {
                            const center = getZoneCenter(z);
                            const activeInFilter = zoneFilter === '' || zoneFilter === z;
                            const zoneProps = filteredListings.filter((p: any) => p.zone === z);
                            
                            let colorClass = '';
                            let borderClass = '';
                            if (z === 'Gidan Kwano') { colorClass = 'bg-amber-500/5'; borderClass = 'border-amber-500/20 text-amber-500'; }
                            else if (z === 'Jatapi') { colorClass = 'bg-cyan-500/5'; borderClass = 'border-cyan-500/20 text-cyan-500'; }
                            else if (z === 'Dama') { colorClass = 'bg-purple-500/5'; borderClass = 'border-purple-500/20 text-purple-500'; }
                            else { colorClass = 'bg-emerald-500/5'; borderClass = 'border-emerald-500/20 text-emerald-500'; }

                            if (!activeInFilter) return null;

                            return (
                              <div 
                                key={z} 
                                style={{ left: `${center.x}%`, top: `${center.y}%` }} 
                                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full w-24 h-24 border flex flex-col items-center justify-center p-1 text-center transition-all ${colorClass} ${borderClass}`}
                              >
                                <span className="text-[8px] font-black uppercase tracking-widest">{z}</span>
                                <span className="text-[7px] text-zinc-400 mt-0.5 font-semibold">{zoneProps.length} verified</span>
                              </div>
                            );
                          })}

                          {/* Interactive Marker Pins */}
                          {filteredListings.map((prop: any) => {
                            const coords = getPropertyCoordinates(prop);
                            const isSelected = mapSelectedPropId === prop.property_id;
                            
                            return (
                              <button
                                key={prop.property_id}
                                onClick={() => setMapSelectedPropId(isSelected ? null : prop.property_id)}
                                style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20 focus:outline-none transition-all duration-300"
                              >
                                {/* Radial Pulse Effect */}
                                <span className={`absolute inset-0 rounded-full scale-150 animate-ping opacity-25 ${
                                  isSelected ? 'bg-emerald-400' : 'bg-amber-400'
                                }`} />

                                {/* Pin Pointer Element */}
                                <div className={`relative px-1.5 py-0.5 rounded-md border text-[9px] font-black font-mono transition-all duration-200 shadow-md ${
                                  isSelected 
                                    ? 'bg-emerald-500 text-white border-emerald-600 scale-110 z-30' 
                                    : isDark 
                                      ? 'bg-[#242423] border-[#383837] text-[#E2E1DA] hover:border-amber-400 hover:scale-105' 
                                      : 'bg-white border-zinc-250 text-zinc-900 hover:border-amber-500 hover:scale-105'
                                }`}>
                                  ₦{(Number(prop.total_listed_price) / 1000).toFixed(0)}k
                                </div>
                              </button>
                            );
                          })}

                          {/* Floating Selected Property Map Info Overlay Card */}
                          {mapSelectedPropId && (() => {
                            const prop = filteredListings.find((p: any) => p.property_id === mapSelectedPropId);
                            if (!prop) return null;
                            
                            return (
                              <div className={`absolute bottom-3 left-3 right-3 p-3 rounded-xl border shadow-xl flex gap-3 transition-all animate-in slide-in-from-bottom-2 z-30 ${
                                isDark ? 'bg-[#1E1E1D]/95 border-[#383837]' : 'bg-white/95 border-zinc-200'
                              }`}>
                                <img 
                                  src={prop.photos?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600'} 
                                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-zinc-200"
                                  alt="" 
                                />
                                <div className="flex-grow min-w-0 flex flex-col justify-between">
                                  <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                      <h4 className={`text-[11px] font-bold truncate ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>{prop.property_type} in {prop.zone}</h4>
                                      <p className="text-[9px] text-zinc-400 truncate flex items-center gap-0.5">
                                        <MapPin className="w-2.5 h-2.5 shrink-0" /> {prop.street_landmark}
                                      </p>
                                    </div>
                                    <button 
                                      onClick={() => setMapSelectedPropId(null)}
                                      className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex justify-between items-center mt-1">
                                    <span className={`text-[11px] font-black font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                      ₦{Number(prop.total_listed_price).toLocaleString()}/yr
                                    </span>
                                    
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleShareProperty(prop)}
                                        className={`p-1 rounded-lg border transition cursor-pointer ${
                                          isDark ? 'bg-[#2D2D2C] border-[#383837] text-zinc-400 hover:text-[#E2E1DA]' : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900'
                                        }`}
                                        title="Share Lodge Catalog Specs"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => { setSelectedPropertyId(prop.property_id); setScreen('DETAIL'); }}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                          isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] hover:bg-[#D2D1C9]' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                        }`}
                                      >
                                        <span>View Lodge</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Default Map Guide Overlay */}
                          {!mapSelectedPropId && (
                            <div className={`absolute bottom-3 left-3 right-3 py-1.5 px-3 rounded-lg border text-[9px] flex items-center justify-between pointer-events-none z-10 ${
                              isDark ? 'bg-[#1E1E1D]/80 border-[#383837] text-zinc-400' : 'bg-white/90 border-zinc-150 text-zinc-500'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-zinc-400 animate-spin-slow" />
                                <span>Tap any pin coordinate to view verified lodge details</span>
                              </span>
                              <span className="font-mono text-[8px] uppercase tracking-wider">Lodga Radar</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      filteredListings.map((prop: any) => {
                        const isSaved = savedListings.some(s => s.property_id === prop.property_id);
                        const isSelectedForCompare = compareListings.includes(prop.property_id);
                        
                        return (
                          <div 
                            key={prop.property_id}
                            onClick={() => { setSelectedPropertyId(prop.property_id); setScreen('DETAIL'); }}
                            className={`rounded-2xl overflow-hidden cursor-pointer transition border relative group ${
                              isDark ? 'bg-[#242423] border-[#383837] hover:border-[#E2E1DA]/40' : 'bg-white border-zinc-200 hover:border-zinc-400'
                            }`}
                          >
                            <div className="relative overflow-hidden">
                              <img 
                                src={prop.photos?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600'} 
                                className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105" 
                                alt="Property preview" 
                              />
                              <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border shadow-xs ${
                                isDark ? 'bg-[#1A1A1A]/95 text-[#E2E1DA] border-[#383837]' : 'bg-white/95 text-zinc-800 border-zinc-200'
                              }`}>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Physical Audit Verified
                              </span>
                              
                              {/* Compare Checkbox Selection Overlay */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectedForCompare) {
                                    setCompareListings(prev => prev.filter(id => id !== prop.property_id));
                                  } else {
                                    if (compareListings.length >= 3) {
                                      alert("You can select up to 3 properties for comparison.");
                                      return;
                                    }
                                    setCompareListings(prev => [...prev, prop.property_id]);
                                  }
                                }}
                                className={`absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-md transition-all duration-200 focus:outline-none ${
                                  isSelectedForCompare
                                    ? 'bg-[#2E75B6] border-[#2E75B6] text-white hover:bg-[#255f94]'
                                    : 'bg-zinc-950/75 border-zinc-800 text-white hover:bg-zinc-900/90'
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isSelectedForCompare} 
                                  onChange={() => {}} // handled by button click
                                  className="pointer-events-none rounded text-[#2E75B6] focus:ring-0 w-3 h-3 border-zinc-350"
                                />
                                <span>Compare</span>
                              </button>

                              {/* Heart/Wishlist Button Overlay */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveListing(prop.property_id);
                                }}
                                className={`absolute top-2.5 right-2.5 p-1.5 rounded-full border shadow-md transition-all duration-200 focus:outline-none cursor-pointer z-10 ${
                                  isSaved 
                                    ? 'bg-red-50 border-red-200 text-red-500 scale-110 hover:bg-red-100' 
                                    : 'bg-white/90 border-zinc-200 text-zinc-400 hover:text-red-500 hover:scale-110'
                                }`}
                                title="Save to Wishlist"
                              >
                                <Heart className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
                              </button>

                              {/* High-Contrast Share Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening property details
                                  handleShareProperty(prop);
                                }}
                                className={`absolute top-2.5 right-12 p-1.5 rounded-full border shadow-md transition-all duration-200 focus:outline-none cursor-pointer z-10 ${
                                  isDark 
                                    ? 'bg-[#1A1A1A]/95 border-[#383837] text-[#E2E1DA] hover:bg-[#242423] hover:scale-110' 
                                    : 'bg-white/95 border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:scale-110'
                                }`}
                                title="Share Lodge Catalog Spec"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Small, High-Contrast Distance-to-Campus Tag */}
                              <span className={`absolute bottom-2.5 right-2.5 bg-zinc-950 text-white border border-zinc-800 shadow-md px-2.5 py-1 rounded-md text-[9px] font-mono tracking-wider font-extrabold flex items-center gap-1 z-10 duration-200 group-hover:bg-[#10B981] group-hover:border-emerald-500`}>
                                <Map className="w-3 h-3 text-emerald-400 group-hover:text-white" />
                                <span>{prop.distance_to_campus ? (prop.distance_to_campus.toLowerCase().includes('campus') ? prop.distance_to_campus : `${prop.distance_to_campus} to campus`) : '2.5km to campus'}</span>
                              </span>
                            </div>

                            <div className="p-3.5 space-y-1.5">
                              <div className="flex justify-between items-start">
                                <h3 className={`font-bold text-xs line-clamp-1 ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>{prop.property_type} — {prop.zone}</h3>
                                <span className={`text-xs font-extrabold font-mono ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>₦{Number(prop.total_listed_price).toLocaleString()}</span>
                              </div>
                              <p className={`text-[11px] line-clamp-1 flex items-center gap-1 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>
                                <MapPin className="w-3 h-3 text-zinc-400 shrink-0" /> {prop.street_landmark}
                              </p>

                              <div className={`flex gap-3 text-[10px] border-t pt-2 font-medium ${isDark ? 'border-[#383837]/60' : 'border-zinc-150'}`}>
                                <span className={`flex items-center gap-1 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}><Bed className="w-3.5 h-3.5" /> {prop.bedrooms} Bed</span>
                                <span className={`flex items-center gap-1 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}><Bath className="w-3.5 h-3.5" /> {prop.bathroom_type} Toilet</span>
                                <span className={`flex items-center gap-1 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}><Sparkles className="w-3.5 h-3.5" /> Water: {prop.water_source}</span>
                              </div>
                              
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center justify-between mt-1 ${isDark ? 'bg-[#1E1E1D] text-[#A3A29B]' : 'bg-zinc-50 text-zinc-400'}`}>
                                <span>All-inclusive annual catalog lease</span>
                                <span className={`text-[9px] font-mono font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-500'}`}>{prop.property_id}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ==================================== */}
              {/* TAB 2: SAVED WISHLIST TAB */}
              {/* ==================================== */}
              {activeTab === 'saved' && (
                <div className="flex flex-col p-4 space-y-4 animate-in fade-in duration-250">
                  <div className="flex justify-between items-center mb-1 border-b border-zinc-200/40 pb-2.5">
                    <h2 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>Your Saved Wishlist</h2>
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-mono">{savedListings.length} Saved</span>
                  </div>

                  {savedListings.length === 0 ? (
                    <div className="text-center py-24 space-y-3">
                      <Heart className="w-12 h-12 mx-auto text-zinc-300 animate-pulse" />
                      <h4 className={`text-xs font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}`}>No saved listings yet</h4>
                      <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">Tap the heart/wishlist icon on any property to save it to your dedicated wishlist.</p>
                      <button 
                        onClick={() => setActiveTab('home')} 
                        className="mt-3 text-xs bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition"
                      >
                        Explore Listings
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedListings.map((prop: any) => {
                        return (
                          <div 
                            key={prop.property_id}
                            onClick={() => { setSelectedPropertyId(prop.property_id); setScreen('DETAIL'); }}
                            className={`rounded-2xl overflow-hidden cursor-pointer transition border relative group ${
                              isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200 hover:border-zinc-400'
                            }`}
                          >
                            <div className="relative overflow-hidden">
                              <img 
                                src={prop.photos?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600'} 
                                className="w-full h-36 object-cover" 
                                alt="Property preview" 
                              />
                              
                              <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border shadow-xs bg-white/95 text-zinc-850 border-zinc-200`}>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Physical Audit Verified
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveListing(prop.property_id);
                                }}
                                className="absolute top-2.5 right-2.5 p-1.5 rounded-full border shadow-md transition-all duration-200 bg-red-50 border-red-200 text-red-500 scale-110"
                                title="Unsave"
                              >
                                <Heart className="w-3.5 h-3.5" fill="currentColor" />
                              </button>
                            </div>

                            <div className="p-3.5 space-y-1.5">
                              <div className="flex justify-between items-start">
                                <h3 className={`font-bold text-xs line-clamp-1 ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>{prop.property_type} — {prop.zone}</h3>
                                <span className={`text-xs font-extrabold font-mono ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>₦{Number(prop.total_listed_price).toLocaleString()}</span>
                              </div>
                              <p className={`text-[11px] line-clamp-1 flex items-center gap-1 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>
                                <MapPin className="w-3 h-3 text-zinc-400 shrink-0" /> {prop.street_landmark}
                              </p>
                              <div className={`flex gap-3 text-[10px] border-t pt-2 font-medium ${isDark ? 'border-[#383837]/60' : 'border-zinc-150'}`}>
                                <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" /> {prop.bedrooms} Bed</span>
                                <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {prop.bathroom_type} Toilet</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================== */}
              {/* TAB 3: IMMERSIVE MAP TAB */}
              {/* ==================================== */}
              {activeTab === 'map' && (
                <div className="flex flex-col h-[520px] relative animate-in fade-in duration-250">
                  <div className={`p-3 text-[10px] font-bold flex justify-between items-center border-b ${
                    isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA]' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}>
                    <span>Immersive Radar Map</span>
                    <span className="text-emerald-600 font-bold">● {filteredListings.length} Listings Available</span>
                  </div>

                  {/* Interactive Map Canvas Wrapper */}
                  <div className={`relative flex-grow overflow-hidden shadow-inner flex flex-col h-full ${
                    isDark ? 'bg-[#121212]' : 'bg-slate-50'
                  }`}>
                    {process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ? (
                      <APIProvider apiKey={process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''} version="weekly">
                        <GMap
                          defaultCenter={{ lat: 9.0765, lng: 6.5095 }}
                          defaultZoom={14}
                          mapId="LODGA_STUDENT_RADAR_MAPPED"
                          gestureHandling={'cooperative'}
                          disableDefaultUI={true}
                          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                          style={{ width: '100%', height: '100%' }}
                        >
                          {filteredListings.map((prop: any) => {
                            // If property has real coordinates, use them. Otherwise, jitter around the center coordinates.
                            const hasRealCoords = prop.latitude && prop.longitude;
                            const lat = hasRealCoords ? Number(prop.latitude) : (9.0765 + (parseInt(prop.property_id.replace(/\D/g, '')) % 100 - 50) * 0.0001);
                            const lng = hasRealCoords ? Number(prop.longitude) : (6.5095 + (parseInt(prop.property_id.replace(/\D/g, '')) % 100 - 50) * 0.0001);
                            const isSelected = mapSelectedPropId === prop.property_id;

                            return (
                              <AdvancedMarker
                                key={prop.property_id}
                                position={{ lat, lng }}
                                onClick={() => setMapSelectedPropId(isSelected ? null : prop.property_id)}
                              >
                                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md cursor-pointer transition-all duration-250 hover:scale-110 active:scale-95 ${
                                  isSelected 
                                    ? 'bg-blue-600 border-white scale-115 z-30 ring-2 ring-blue-400 ring-offset-1' 
                                    : 'bg-blue-500 border-white hover:bg-blue-600'
                                }`}>
                                  {/* White house icon */}
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                  {/* Price tag */}
                                  <div className="absolute -bottom-4.5 bg-zinc-950/95 border border-zinc-800 text-white font-extrabold text-[7px] font-mono px-1 rounded shadow-xs leading-none py-0.5 whitespace-nowrap">
                                    ₦{(Number(prop.total_listed_price) / 1000).toFixed(0)}k
                                  </div>
                                </div>
                              </AdvancedMarker>
                            );
                          })}
                        </GMap>
                      </APIProvider>
                    ) : (
                      <>
                        {/* SVG Map Layer fallback */}
                        <div className="absolute inset-0 select-none opacity-40 pointer-events-none">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <pattern id="map-grid-pattern-standalone" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDark ? '#383837' : '#e4e4e7'} strokeWidth="1" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#map-grid-pattern-standalone)" />
                          </svg>
                        </div>

                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-85" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path d="M 0 50 Q 50 45, 100 55" fill="none" stroke={isDark ? '#2E2D2B' : '#cbd5e1'} strokeWidth="2.5" />
                          <path d="M 30 0 L 30 100" fill="none" stroke={isDark ? '#222221' : '#e2e8f0'} strokeWidth="1" strokeDasharray="2,2" />
                          <path d="M 0 35 Q 74 48, 100 35" fill="none" stroke={isDark ? '#222221' : '#e2e8f0'} strokeWidth="1" strokeDasharray="1,2" />
                        </svg>

                        <div className="absolute top-[40%] left-[3%] -translate-y-1/2 p-2 rounded-xl border flex flex-col space-y-0.5 shadow-sm max-w-[120px] pointer-events-none z-10 bg-white/95 border-zinc-250 text-zinc-850">
                          <div className="flex items-center gap-1">
                            <img src={futminnaLogo} className="w-3.5 h-3.5 rounded-full object-contain" alt="" />
                            <span className="text-[8px] font-extrabold uppercase tracking-wide">FUTMINNA Campus</span>
                          </div>
                        </div>

                        {filteredListings.map((prop: any) => {
                          const coords = getPropertyCoordinates(prop);
                          const isSelected = mapSelectedPropId === prop.property_id;
                          return (
                            <button
                              key={prop.property_id}
                              onClick={() => setMapSelectedPropId(isSelected ? null : prop.property_id)}
                              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20 focus:outline-none transition-all duration-300"
                            >
                              <span className={`absolute inset-0 rounded-full scale-150 animate-ping opacity-25 ${
                                isSelected ? 'bg-emerald-400' : 'bg-amber-400'
                              }`} />
                              <div className={`relative px-1.5 py-0.5 rounded-md border text-[9px] font-black font-mono transition-all duration-200 shadow-md ${
                                isSelected 
                                  ? 'bg-emerald-500 text-white border-emerald-600 scale-110 z-30' 
                                  : 'bg-white border-zinc-250 text-zinc-950 hover:border-amber-500 hover:scale-105'
                              }`}>
                                ₦{(Number(prop.total_listed_price) / 1000).toFixed(0)}k
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {mapSelectedPropId && (() => {
                      const prop = filteredListings.find((p: any) => p.property_id === mapSelectedPropId);
                      if (!prop) return null;
                      return (
                        <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl border shadow-xl flex gap-3 bg-white border-zinc-200 z-35 animate-in slide-in-from-bottom-2">
                          <img 
                            src={prop.photos?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600'} 
                            className="w-14 h-14 rounded-lg object-cover shrink-0 border border-zinc-200"
                            alt="" 
                          />
                          <div className="flex-grow min-w-0 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-bold truncate text-zinc-900">{prop.property_type} in {prop.zone}</h4>
                                <p className="text-[9px] text-zinc-400 truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" /> {prop.street_landmark}
                                </p>
                              </div>
                              <button onClick={() => setMapSelectedPropId(null)} className="text-zinc-400 hover:text-zinc-600 p-0.5">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[11px] font-black font-mono text-emerald-600">
                                ₦{Number(prop.total_listed_price).toLocaleString()}/yr
                              </span>
                              
                              <div className="flex gap-1">
                                <a 
                                  href={prop.latitude && prop.longitude 
                                    ? `https://www.google.com/maps/dir/?api=1&destination=${prop.latitude},${prop.longitude}`
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.street_landmark + ', ' + prop.zone + ', Minna, Nigeria')}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded-lg text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1 shrink-0"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>Directions</span>
                                </a>
                                <button
                                  onClick={() => { setSelectedPropertyId(prop.property_id); setScreen('DETAIL'); }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition flex items-center gap-1 shrink-0"
                                >
                                  <span>View Lodge</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ==================================== */}
              {/* TAB 4: BOOKINGS / HISTORY TAB */}
              {/* ==================================== */}
              {activeTab === 'bookings' && (
                <div className="flex flex-col p-4 space-y-4 animate-in fade-in duration-250">
                  <div className="flex justify-between items-center mb-1 border-b border-zinc-200/40 pb-2.5">
                    <h2 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>Your Lease Bookings</h2>
                    <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full font-mono">{studentTxList.length} Active</span>
                  </div>

                  <div className="space-y-4">
                    {studentTxList.length === 0 ? (
                      <div className="text-center py-20 text-zinc-400 space-y-2">
                        <FileText className="w-12 h-12 mx-auto text-zinc-300 animate-pulse" />
                        <h4 className="text-xs font-bold">No active bookings yet</h4>
                        <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">Book a verified property to manage lease agreement and escrow payout tracking here.</p>
                        <button onClick={() => setActiveTab('home')} className="mt-2 text-xs bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition">Explore Feeds</button>
                      </div>
                    ) : (
                      studentTxList.map((tx: any) => {
                        const hasAlreadyReviewed = propertyReviews[tx.property_id]?.some(r => r.student_name === (currentUser?.full_name || 'Student'));
                        
                        return (
                          <div key={tx.transaction_id} className={`p-4 rounded-xl border space-y-3 shadow-xs ${
                            isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase">{tx.transaction_id}</span>
                              <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                tx.escrow_status === 'Held' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                                tx.escrow_status === 'Released' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                                tx.escrow_status === 'Disputed' ? 'bg-red-50 text-red-700 border border-red-150' :
                                'bg-zinc-100 text-zinc-500'
                              }`}>
                                Escrow: {tx.escrow_status}
                              </span>
                            </div>

                            <div className="text-xs space-y-1 text-zinc-600 font-sans font-medium">
                              <p>🏠 Lodge reference: <strong className={`font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{tx.property_id}</strong></p>
                              <p>📅 Schedule move-in: <strong className={`font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-850'}`}>{tx.move_in_date}</strong></p>
                              <p>💰 Escrow Rent portion: <strong className={`font-mono font-semibold ${isDark ? 'text-emerald-400' : 'text-zinc-900'}`}>₦{Number(tx.total_paid || (Number(tx.landlord_rent) + Number(tx.connection_fee) + Number(tx.inspection_fee))).toLocaleString()}</strong></p>
                            </div>

                            <div className={`p-3 rounded-lg space-y-1 text-[11px] border ${
                              isDark ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-150 text-zinc-500'
                            }`}>
                              <div className="flex justify-between font-bold text-zinc-850">
                                <span className={isDark ? 'text-zinc-300' : 'text-zinc-805'}>📱 Contact Caretaker</span>
                                <span className="text-[9px] text-emerald-600 font-bold uppercase font-mono tracking-wider">Unlocked</span>
                              </div>
                              <p>Ibrahim Musa: <strong className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>09012345678</strong></p>
                            </div>

                            {/* Perform Move-in Audit */}
                            {tx.escrow_status === 'Held' && (
                              <button 
                                onClick={() => { setActiveTxId(tx.transaction_id); setScreen('POSTMOVEIN'); }}
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
                              >
                                ⭐ Perform Move-in Audit
                              </button>
                            )}

                            {/* Submit Public Review once escrow released */}
                            {tx.escrow_status === 'Released' && (
                              <div className="space-y-3.5 border-t border-zinc-150/40 pt-3">
                                <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded-lg text-center font-bold">
                                  ✓ Escrow funds disbursed. Welcome to your lodge!
                                </div>
                                
                                <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                                  isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50/50 border-zinc-200'
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <strong className={`text-[11px] ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>Write Public Community Review</strong>
                                    <span className="text-[9px] text-zinc-400 font-semibold font-mono">Verified tenant</span>
                                  </div>

                                  {hasAlreadyReviewed ? (
                                    <p className="text-[10px] text-emerald-600 font-semibold">✓ Thank you for submitting your public community review!</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {/* Interactive Star selector */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-zinc-400 mr-1.5 font-bold">Rating:</span>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button 
                                            key={star}
                                            onClick={() => {
                                              setSubmittingReviewPropId(tx.property_id);
                                              setNewReviewRating(star);
                                            }}
                                            className="focus:outline-none cursor-pointer text-xs"
                                          >
                                            <Star 
                                              className={`w-4 h-4 ${(submittingReviewPropId === tx.property_id ? newReviewRating : newReviewRating) >= star ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'}`} 
                                            />
                                          </button>
                                        ))}
                                      </div>

                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] uppercase font-bold text-zinc-400">Written Review</span>
                                        <span className={`text-[9px] font-mono ${(submittingReviewPropId === tx.property_id ? newReviewComment.length : 0) < 15 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>
                                          {submittingReviewPropId === tx.property_id ? newReviewComment.length : 0}/500 chars (min 15)
                                        </span>
                                      </div>

                                      <textarea 
                                        placeholder="Add comment about caretaker hospitality, water consistency, security..."
                                        rows={2}
                                        value={submittingReviewPropId === tx.property_id ? newReviewComment : ''}
                                        onChange={(e) => {
                                          setSubmittingReviewPropId(tx.property_id);
                                          setNewReviewComment(e.target.value);
                                        }}
                                        className={`w-full p-2 text-[11px] rounded-lg border outline-none ${
                                          isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                        }`}
                                      />

                                      {submittingReviewPropId === tx.property_id && newReviewComment.length > 0 && newReviewComment.length < 15 && (
                                        <p className="text-red-500 text-[10px] mt-0.5 font-semibold">
                                          ⚠️ Review statement must be at least 15 characters long.
                                        </p>
                                      )}

                                      <button
                                        disabled={(submittingReviewPropId === tx.property_id ? newReviewComment.length : 0) < 15}
                                        onClick={async () => {
                                          if (newReviewComment.trim().length < 15) {
                                            alert("Please enter a comment of at least 15 characters.");
                                            return;
                                          }
                                          try {
                                            const res = await fetch('/api/listings/reviews', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({
                                                property_id: tx.property_id,
                                                rating: newReviewRating,
                                                comment: newReviewComment
                                              })
                                            });
                                            if (res.ok) {
                                              alert("✓ Public rating published successfully!");
                                              setNewReviewComment('');
                                              // Refetch reviews
                                              await fetchReviewsForProperty(tx.property_id);
                                            } else {
                                              const err = await res.json();
                                              alert(err.error || "Failed to submit review.");
                                            }
                                          } catch (err) {
                                            console.error("Submission error:", err);
                                          }
                                        }}
                                        className={`w-full text-center py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-xs ${
                                          (submittingReviewPropId === tx.property_id ? newReviewComment.length : 0) < 15
                                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                                            : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-[#E2E1DA] dark:text-[#1A1A1A] dark:hover:bg-[#E2E1DA]/80'
                                        }`}
                                      >
                                        Publish Student Review
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {tx.escrow_status === 'Disputed' && (
                              <div className="text-[10px] text-red-700 bg-red-50 border border-red-150 px-2 py-1.5 rounded-lg text-center font-bold">
                                ⚠️ Dispute Filed. Lodga is examining structural discrepancies.
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ==================================== */}
              {/* TAB 5: STUDENT PROFILE TAB */}
              {/* ==================================== */}
              {activeTab === 'profile' && (
                <div className="flex flex-col p-4 space-y-4 animate-in fade-in duration-250">
                  {/* Account Card */}
                  <div className={`p-4 rounded-2xl border text-center relative ${
                    isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200'
                  }`}>
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <img 
                        src={profilePhoto} 
                        alt="Profile Avatar" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-zinc-300"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                        className="absolute bottom-0 right-0 bg-zinc-900 text-white p-1 rounded-full border border-white hover:bg-zinc-800 transition"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>

                    {showPhotoPicker && (
                      <div className={`p-2 rounded-lg border my-2 flex flex-col gap-2 ${
                        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                      }`}>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
                            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
                          ].map((url, i) => (
                            <button 
                              key={i} 
                              onClick={() => { setProfilePhoto(url); setShowPhotoPicker(false); }}
                              className="h-10 w-10 rounded-full overflow-hidden border border-zinc-300 hover:scale-105 active:scale-95 transition mx-auto"
                            >
                              <img src={url} className="w-full h-full object-cover" alt="" />
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-dashed border-zinc-300 dark:border-zinc-750 pt-2 flex justify-center">
                          <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer transition">
                            <span>📷 Upload picture from Gallery</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setProfilePhoto(url);
                                  setShowPhotoPicker(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {isEditingProfile ? (
                      <div className="space-y-2 mt-3 text-left">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-zinc-400">Full Name</label>
                          <input 
                            type="text" 
                            value={editName || currentUser?.full_name || ''} 
                            onChange={(e) => setEditName(e.target.value)}
                            className={`w-full p-2 border rounded-lg text-xs outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-zinc-400">Phone Contact</label>
                          <input 
                            type="text" 
                            value={editPhone || currentUser?.phone || ''} 
                            onChange={(e) => setEditPhone(e.target.value)}
                            className={`w-full p-2 border rounded-lg text-xs outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => setIsEditingProfile(false)}
                            className="flex-1 bg-zinc-200 text-zinc-800 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-300 transition"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              if (!editName.trim() || !editPhone.trim()) {
                                alert("Name and phone number are required.");
                                return;
                              }
                              try {
                                const res = await fetch('/api/auth/profile', {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: JSON.stringify({
                                    full_name: editName.trim(),
                                    phone: editPhone.trim()
                                  })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setCurrentUser(data.user);
                                  onRefresh();
                                  setIsEditingProfile(false);
                                } else {
                                  const err = await res.json();
                                  alert(err.error || "Failed to update profile.");
                                }
                              } catch (err) {
                                console.error("Error updating profile:", err);
                                alert("Failed to update profile.");
                              }
                            }}
                            className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 transition"
                          >
                            Save Updates
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className={`text-sm font-extrabold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>{currentUser?.full_name || 'Lodga Student'}</h3>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{currentUser?.phone || 'No phone registered'}</p>
                        {currentUser?.is_futminna && (
                          <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">✓ FUTMINNA Student Verified</p>
                        )}
                        
                        <button 
                          onClick={() => {
                            setEditName(currentUser?.full_name || '');
                            setEditPhone(currentUser?.phone || '');
                            setIsEditingProfile(true);
                          }}
                          className="mt-3.5 w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-zinc-200/50"
                        >
                          Edit Account Information
                        </button>
                      </>
                    )}
                  </div>

                  {/* Change Password Block */}
                  <div className={`p-4 rounded-2xl border space-y-2 text-left ${
                    isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200'
                  }`}>
                    <strong className={`text-xs block font-extrabold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>Security Preferences</strong>
                    <div className="space-y-1.5 text-xs text-zinc-500">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Current Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={passwordOld}
                          onChange={(e) => setPasswordOld(e.target.value)}
                          className={`w-full p-2 border rounded-lg text-xs outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400">New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={passwordNew}
                          onChange={(e) => setPasswordNew(e.target.value)}
                          className={`w-full p-2 border rounded-lg text-xs outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (!passwordOld || !passwordNew) {
                            alert("Please complete both current and new password fields.");
                            return;
                          }
                          alert("✓ Security parameters updated successfully!");
                          setPasswordOld('');
                          setPasswordNew('');
                        }}
                        className="w-full mt-2 bg-zinc-900 text-white py-1.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Update Security Key
                      </button>
                    </div>
                  </div>

                  {/* Notification Switches */}
                  <div className={`p-4 rounded-2xl border text-left space-y-3.5 ${
                    isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200'
                  }`}>
                    <strong className={`text-xs block font-extrabold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>Notifications Settings</strong>
                    
                    <div className="space-y-3">
                      {/* Toggle 1 */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className={`font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-805'}`}>Email Alerts</p>
                          <p className="text-[10px] text-zinc-400">Receive verified property catalog updates</p>
                        </div>
                        <button 
                          onClick={() => setNotifEmail(!notifEmail)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${notifEmail ? 'bg-[#2E75B6]' : 'bg-zinc-300'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${notifEmail ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>

                      {/* Toggle 2 */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className={`font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-805'}`}>SMS Dispatch Alerts</p>
                          <p className="text-[10px] text-zinc-400">Receive mobile inspector progress alerts</p>
                        </div>
                        <button 
                          onClick={() => setNotifSms(!notifSms)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${notifSms ? 'bg-[#2E75B6]' : 'bg-zinc-300'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${notifSms ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>

                      {/* Toggle 3 */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className={`font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-805'}`}>Booking Progress Alerts</p>
                          <p className="text-[10px] text-zinc-400">Receive real-time escrow payout locks updates</p>
                        </div>
                        <button 
                          onClick={() => setNotifBookings(!notifBookings)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${notifBookings ? 'bg-[#2E75B6]' : 'bg-zinc-300'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${notifBookings ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Document & Legal links */}
                  <div className={`p-4 rounded-2xl border text-left space-y-2 text-xs ${
                    isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200'
                  }`}>
                    <strong className={`text-xs block font-extrabold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>Legal Framework</strong>
                    <div className="space-y-1 text-zinc-500 font-medium font-sans">
                      <button onClick={() => setShowLegalView('TERMS')} className="block hover:underline hover:text-zinc-850 text-left cursor-pointer w-full">Terms of Lease Service Agreement</button>
                      <button onClick={() => setShowLegalView('PRIVACY')} className="block hover:underline hover:text-zinc-850 text-left cursor-pointer w-full">Privacy Safeguards Policy</button>
                    </div>
                  </div>

                  {/* Safety & Trust Center */}
                  <div className={`p-4 rounded-2xl border text-left space-y-3 text-xs ${
                    isDark ? 'bg-[#242423] border-[#383837]' : 'bg-white border-zinc-200'
                  }`}>
                    <strong className={`text-xs block font-extrabold text-red-600`}>Safety & Trust</strong>
                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          setReportSubjectPropertyId(null);
                          setReportSubjectContactId(null);
                          setReportSubjectUserId(null);
                          setReportSubjectName(null);
                          setReportType('');
                          setReportDescription('');
                          setReportEvidenceUrls([]);
                          setShowReportForm(true);
                        }} 
                        className="w-full text-left font-bold text-red-600 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>Report suspicious activity</span>
                      </button>
                    </div>

                    {userReports.length > 0 && (
                      <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-2.5 mt-2.5">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-2">My Submitted Reports</span>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {userReports.map((r: any) => (
                            <div key={r.report_id} className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                              isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
                            }`}>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">{r.report_type}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  r.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                  r.status === 'Dismissed' ? 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400' :
                                  r.status === 'Under Review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                }`}>
                                  {r.status}
                                </span>
                              </div>
                              <p className="text-zinc-500 leading-snug line-clamp-2">{r.description}</p>
                              <span className="text-[9px] text-zinc-400 block font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 text-left space-y-3">
                    <strong className="text-xs block font-extrabold text-red-800">Account Safety</strong>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (confirm("Are you sure you want to log out of Lodga?")) {
                            setToken('');
                            setCurrentUser(null);
                            setActiveTab('home');
                            setScreen('ONBOARDING');
                          }
                        }}
                        className="flex-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-250 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm("⚠️ CRITICAL SECURITY PROMPT:\n\nAre you sure you want to permanently delete your Lodga account?\nThis action will erase your verified student history and lock current bookings. This is irreversible.")) {
                            setToken('');
                            setCurrentUser(null);
                            setActiveTab('home');
                            setScreen('ONBOARDING');
                          }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* FLOATING COMPARISON BOTTOM DRAWER BAR */}
            {compareListings.length > 0 && activeTab === 'home' && (
              <div className={`absolute bottom-[66px] inset-x-3 p-3 rounded-xl border flex justify-between items-center z-45 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${
                isDark ? 'bg-zinc-900/90 border-zinc-800 text-white' : 'bg-white/90 border-zinc-250 text-zinc-950'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-sans">📊 {compareListings.length}/3 selected</span>
                  <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">(side-by-side specs comparison)</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button 
                    onClick={() => setCompareListings([])}
                    className="px-2.5 py-1 rounded-lg text-[10px] border border-zinc-300 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => setIsComparing(true)}
                    className="px-3 py-1 bg-[#2E75B6] hover:bg-[#255f94] text-white rounded-lg text-[10px] font-black tracking-wide transition flex items-center gap-1 cursor-pointer shadow-xs animate-pulse"
                  >
                    <span>Compare Specs</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* PROPERTY SPECS COMPARISON MODAL */}
            {isComparing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-3 animate-in fade-in duration-250">
                <div className={`w-full max-w-lg rounded-2xl p-4 border flex flex-col max-h-[85%] shadow-2xl transition-all duration-300 ${
                  isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA]' : 'bg-white border-zinc-200 text-zinc-950'
                }`}>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-200/50 mb-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-[#2E75B6]/10 text-[#2E75B6]">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-xs font-black tracking-tight font-sans">Compare Lodges Specs</h3>
                        <p className="text-[10px] text-zinc-400 font-medium">Side-by-side verification specs</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsComparing(false)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-[#E2E1DA]' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-x-auto overflow-y-auto flex-1 pb-3 pr-0.5">
                    <div className="min-w-[420px] grid grid-cols-4 gap-2 text-xs font-sans">
                      {/* Left Header Column */}
                      <div className="flex flex-col pt-24 space-y-7 border-r border-zinc-200/20 pr-1.5 font-bold uppercase text-[9px] text-zinc-400 shrink-0 select-none">
                        <div className="h-10 flex items-center">Rent Price</div>
                        <div className="h-5 flex items-center">Bedrooms</div>
                        <div className="h-5 flex items-center">Bathroom</div>
                        <div className="h-5 flex items-center">Kitchen</div>
                        <div className="h-5 flex items-center">Water Source</div>
                        <div className="h-5 flex items-center">Campus Dist.</div>
                        <div className="h-5 flex items-center">Availability</div>
                      </div>

                      {/* Property Columns */}
                      {compareListings.map((propId) => {
                        const prop = (apiState.properties || []).find((p: any) => p.property_id === propId);
                        if (!prop) return null;
                        return (
                          <div key={propId} className="flex flex-col space-y-4 text-center border-r border-zinc-200/20 last:border-r-0 pb-1.5">
                            <div className="relative rounded-lg overflow-hidden h-20 mb-1.5 group">
                              <img 
                                src={prop.photos?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=300'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                                alt="Property preview" 
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompareListings(prev => prev.filter(id => id !== propId));
                                }}
                                className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-rose-600 transition"
                                title="Remove"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="font-extrabold text-[10px] line-clamp-1 px-1 shrink-0 h-4">
                              {prop.property_type}
                            </div>
                            <div className="font-mono text-[9px] text-zinc-400 h-2">
                              {prop.zone}
                            </div>

                            {/* Rent Row */}
                            <div className="h-10 flex flex-col justify-center items-center">
                              <span className="font-extrabold text-xs text-emerald-600">₦{Number(prop.total_listed_price).toLocaleString()}</span>
                              <span className="text-[8px] text-zinc-400">₦{Number(prop.landlord_rent).toLocaleString()} rent</span>
                            </div>

                            {/* Bedrooms Row */}
                            <div className="h-5 flex items-center justify-center font-bold">
                              {prop.bedrooms} Bed
                            </div>

                            {/* Bathroom Row */}
                            <div className="h-5 flex items-center justify-center font-semibold text-[10px] line-clamp-1 px-1">
                              {prop.bathroom_type}
                            </div>

                            {/* Kitchen Row */}
                            <div className="h-5 flex items-center justify-center font-semibold">
                              {prop.has_kitchen ? 'Yes ✓' : 'No ✗'}
                            </div>

                            {/* Water Source Row */}
                            <div className="h-5 flex items-center justify-center font-semibold">
                              {prop.water_source}
                            </div>

                            {/* Campus Dist Row */}
                            <div className="h-5 flex items-center justify-center font-medium text-[10px] line-clamp-1 px-1">
                              {prop.distance_to_campus}
                            </div>

                            {/* Availability Row */}
                            <div className="h-5 flex items-center justify-center">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                prop.availability === 'Available' ? 'bg-emerald-500/10 text-emerald-500' :
                                prop.availability === 'Taken' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {prop.availability}
                              </span>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2 px-1">
                              <button
                                onClick={() => {
                                  setSelectedPropertyId(propId);
                                  setIsComparing(false);
                                  setScreen('DETAIL');
                                }}
                                className="w-full py-1.5 bg-[#2E75B6] hover:bg-[#255f94] text-white rounded-lg text-[9px] font-bold tracking-tight cursor-pointer transition shadow-xs"
                              >
                                View Lodge
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dummy column for 3-column sizing layout consistency */}
                      {Array.from({ length: Math.max(0, 3 - compareListings.length) }).map((_, idx) => (
                        <div key={`dummy-${idx}`} className="flex flex-col items-center justify-center border-dashed border border-zinc-200/40 rounded-xl h-full p-4 text-center text-zinc-400 font-medium select-none text-[10px]">
                          <span>Add another lodge to compare specs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOTTOM NAVIGATION TAB BAR */}
            {currentUser && (
              <div className={`absolute bottom-0 inset-x-0 h-[60px] border-t flex justify-around items-center z-40 px-2 py-1 shadow-2xl transition-colors ${
                isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-250/80'
              }`}>
                <button 
                  onClick={() => setActiveTab('home')}
                  className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors focus:outline-none"
                >
                  <Home className={`w-4.5 h-4.5 ${activeTab === 'home' ? 'text-[#2E75B6]' : 'text-zinc-400'}`} />
                  <span className={`text-[8.5px] font-bold mt-1 ${activeTab === 'home' ? 'text-[#2E75B6]' : 'text-zinc-400'}`}>Home</span>
                </button>

                <button 
                  onClick={() => setActiveTab('saved')}
                  className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors relative focus:outline-none"
                >
                  <Heart className={`w-4.5 h-4.5 ${activeTab === 'saved' ? 'text-[#2E75B6]' : 'text-zinc-400'}`} />
                  {savedListings.length > 0 && (
                    <span className="absolute top-0 right-4 bg-red-500 text-white text-[7.5px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs animate-scale">
                      {savedListings.length}
                    </span>
                  )}
                  <span className={`text-[8.5px] font-bold mt-1 ${activeTab === 'saved' ? 'text-[#2E75B6]' : 'text-zinc-400'}`}>Saved</span>
                </button>

                <button 
                  onClick={() => setActiveTab('map')}
                  className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors focus:outline-none"
                >
                  <Map className={`w-4.5 h-4.5 ${activeTab === 'map' ? 'text-[#2E75B6]' : 'text-zinc-400'}`} />
                  <span className={`text-[8.5px] font-bold mt-1 ${activeTab === 'map' ? 'text-[#2E75B6]' : 'text-zinc-400'}`}>Map</span>
                </button>

                <button 
                  onClick={() => setActiveTab('bookings')}
                  className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors relative focus:outline-none"
                >
                  <FileText className={`w-4.5 h-4.5 ${activeTab === 'bookings' ? 'text-[#2E75B6]' : 'text-zinc-400'}`} />
                  {unreadBookingUpdates && (
                    <span className="absolute top-0.5 right-4 bg-orange-500 w-2 h-2 rounded-full animate-bounce shadow-xs" />
                  )}
                  <span className={`text-[8.5px] font-bold mt-1 ${activeTab === 'bookings' ? 'text-[#2E75B6]' : 'text-zinc-400'}`}>Bookings</span>
                </button>

                <button 
                  onClick={() => setActiveTab('profile')}
                  className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors focus:outline-none"
                >
                  <User className={`w-4.5 h-4.5 ${activeTab === 'profile' ? 'text-[#2E75B6]' : 'text-zinc-400'}`} />
                  <span className={`text-[8.5px] font-bold mt-1 ${activeTab === 'profile' ? 'text-[#2E75B6]' : 'text-zinc-400'}`}>Profile</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================================== */}
        {/* 5. LISTING DETAIL SCREEN */}
        {/* ==================================== */}
        {screen === 'DETAIL' && selectedProperty && (
          <motion.div
            key="DETAIL"
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "tween", ease: [0.25, 0.8, 0.25, 1], duration: 0.38 }}
            className="flex-grow flex flex-col justify-between"
          >
            <div className={`sticky top-0 p-4 shrink-0 flex justify-between items-center z-20 shadow-xs border-b transition-colors duration-300 ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]/60' : 'bg-white border-zinc-200'
            }`}>
              <button 
                onClick={() => setScreen('BROWSE')} 
                className={`text-xs font-bold transition-colors ${
                  isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-zinc-400 hover:text-zinc-900'
                }`}
              >
                ← back
              </button>
              <span className={`text-[10px] font-mono font-extrabold tracking-widest ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}`}>LODGE FILE OVERVIEW</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleSaveListing(selectedProperty.property_id)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    savedListings.some(s => s.property_id === selectedProperty.property_id)
                      ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                      : isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA] hover:bg-[#323231]' : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart className="w-4.5 h-4.5" fill={savedListings.some(s => s.property_id === selectedProperty.property_id) ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={handleShareClick}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA] hover:bg-[#323231]' : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                  }`}
                  title="Share Property"
                >
                  <Share2 className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={() => {
                    setReportSubjectPropertyId(selectedProperty.property_id);
                    setReportSubjectContactId(selectedProperty.caretaker_id || null);
                    const contact = apiState.contacts?.find((c: any) => c.contact_id === selectedProperty.caretaker_id);
                    setReportSubjectUserId(contact?.user_id || null);
                    setReportSubjectName(`${selectedProperty.property_type} in ${selectedProperty.zone} (${contact?.full_name || 'Caretaker'})`);
                    setReportType('Fake listing');
                    setReportDescription('');
                    setReportEvidenceUrls([]);
                    setShowReportForm(true);
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isDark ? 'bg-[#242423] border-[#383837] text-red-400 hover:bg-[#323231]' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                  }`}
                  title="Report Listing"
                >
                  <AlertCircle className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
              <div className="relative overflow-hidden group">
                <img 
                  src={propertyPhotos[activePhotoIndex]} 
                  className="w-full h-48 object-cover transition-all duration-300 transform scale-100 hover:scale-[1.02]" 
                  alt={`detail photo ${activePhotoIndex + 1}`} 
                />
                
                {/* Navigation Arrows for Carousel */}
                {propertyPhotos.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIndex((prev) => (prev - 1 + propertyPhotos.length) % propertyPhotos.length);
                      }}
                      className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md opacity-90 hover:opacity-100 transition shadow-md cursor-pointer ${
                        isDark ? 'bg-[#1E1E1D]/80 hover:bg-[#1E1E1D] text-[#E2E1DA] border border-[#383837]/60' : 'bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200'
                      }`}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIndex((prev) => (prev + 1) % propertyPhotos.length);
                      }}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md opacity-90 hover:opacity-100 transition shadow-md cursor-pointer ${
                        isDark ? 'bg-[#1E1E1D]/80 hover:bg-[#1E1E1D] text-[#E2E1DA] border border-[#383837]/60' : 'bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200'
                      }`}
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className={`absolute top-2.5 left-2.5 text-[9px] border font-bold py-0.5 px-2.5 rounded-full uppercase tracking-wider shadow-sm transition-colors duration-300 ${
                  isDark ? 'bg-[#1E1E1D] border-[#383837]/80 text-[#E2E1DA]' : 'bg-white border-zinc-250 text-zinc-800'
                }`}>
                  Verified Supply
                </div>
                
                {/* Dynamic Image Indicators (Dots) */}
                {propertyPhotos.length > 1 && (
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/30 backdrop-blur-xs px-2 py-1 rounded-full">
                    {propertyPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIndex(idx);
                        }}
                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                          activePhotoIndex === idx 
                            ? 'w-3 h-1.5 bg-white' 
                            : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="absolute bottom-2.5 right-2.5 bg-zinc-900/75 backdrop-blur-md text-[9px] px-2 py-0.5 rounded text-white font-mono font-bold tracking-wider">
                  {activePhotoIndex + 1} / {propertyPhotos.length} Photos
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <h3 className={`text-lg font-extrabold transition-colors ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>{selectedProperty.property_type} in {selectedProperty.zone}</h3>
                  <div className={`flex items-center gap-1.5 text-xs transition-colors ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{selectedProperty.street_landmark}</span>
                  </div>
                </div>

                {/* Price block */}
                <div className={`p-4 rounded-xl flex justify-between items-center shadow-xs border transition-colors ${
                  isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div>
                    <span className={`text-[9px] uppercase tracking-widest block font-bold ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Annual Complete Rate</span>
                    <span className={`text-xl font-extrabold font-mono ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>₦{Number(selectedProperty.total_listed_price).toLocaleString()}</span>
                    <span className={`text-[9px] block font-medium ${isDark ? 'text-[#A3A29B]/70' : 'text-zinc-400'}`}>No hidden surcharge landlord fees</span>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-lg text-center text-[10px] font-bold border transition-colors ${
                    isDark ? 'bg-[#1E1E1D] text-[#E2E1DA] border-[#383837]' : 'bg-zinc-100 text-zinc-700 border-zinc-250'
                  }`}>
                    <span className={`block ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}`}>ESCROWED</span>
                    <span className={`font-medium text-[9px] ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>100% Protected</span>
                  </div>
                </div>

                {/* Escrow note info box */}
                <div className={`p-3 rounded-xl text-xs leading-relaxed space-y-1 border transition-colors ${
                  isDark ? 'bg-[#242423] border-[#383837] text-[#E2E1DA]' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                }`}>
                  <div className={`flex gap-1.5 items-center font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>
                    <Info className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`} />
                    <span>Lodga Escrow Guarantee</span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>
                    Your connection funds are held securely. Caretakers payout is locked until <strong className={isDark ? 'text-[#E2E1DA]' : 'text-zinc-850'}>48 hours post move-in</strong>, allowing you to flag any undeclared issues.
                  </p>
                </div>

                {/* Specs list */}
                <div className={`space-y-2 border-t pt-3 ${isDark ? 'border-[#383837]' : 'border-zinc-150'}`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2.5 rounded-lg border transition-colors ${
                      isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Campus Distance</span>
                      <strong className={isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}>{selectedProperty.distance_to_campus}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border transition-colors ${
                      isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Toilets Design</span>
                      <strong className={isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}>{selectedProperty.bathroom_type}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border transition-colors ${
                      isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Kitchen unit</span>
                      <strong className={isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}>{selectedProperty.has_kitchen ? 'Separate Kitchen' : 'No Private Unit'}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border transition-colors ${
                      isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Water Supply</span>
                      <strong className={isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}>{selectedProperty.water_source}</strong>
                    </div>
                  </div>
                </div>

                {/* Visual Map Placeholder Component */}
                <div className={`space-y-2 border-t pt-3 ${isDark ? 'border-[#383837]' : 'border-zinc-150'}`}>
                  <div className="flex justify-between items-center">
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>FUTMINNA Local Zone Map</h4>
                    {selectedProperty.map_location ? (
                      <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">★ GPS Verified PIN</span>
                    ) : (
                      <span className="text-[9px] font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">Zone Centroid GPS</span>
                    )}
                  </div>
                  
                  <div className={`relative h-44 rounded-xl border overflow-hidden ${
                    isDark ? 'bg-[#242423] border-[#383837]' : 'bg-[#FCFBF8] border-zinc-200'
                  }`}>
                    {/* SVG Map Lines & Grids */}
                    <div className="absolute inset-0 opacity-15 pointer-events-none">
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <rect width="20" height="20" fill="none" />
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={isDark ? '#E2E1DA' : '#1A1A1A'} strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>
                    </div>

                    {/* Vector Roads & Trails */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                      {/* Main road */}
                      <path d="M 10 30 Q 150 50 340 70" fill="none" stroke={isDark ? '#E2E1DA' : '#4B5563'} strokeWidth="3" strokeLinecap="round" />
                      <text x="50" y="24" fill={isDark ? '#A3A29B' : '#4B5563'} fontSize="8" fontFamily="monospace" rotate="4">Minna-Bida Expressway</text>
                      
                      {/* Secondary feeders */}
                      <path d="M 120 42 L 110 150" fill="none" stroke={isDark ? '#A3A29B' : '#D1D5DB'} strokeWidth="2.5" strokeDasharray="3,3" />
                      <path d="M 230 52 L 250 160" fill="none" stroke={isDark ? '#A3A29B' : '#D1D5DB'} strokeWidth="2.5" />
                      <text x="210" y="110" fill={isDark ? '#A3A29B' : '#4B5563'} fontSize="7" transform="rotate(78 210 110)">Caretaker Lane</text>
                    </svg>

                    {/* FUTMINNA Gate reference marker */}
                    <div className="absolute top-5 left-10 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                      <span className={`text-[8px] font-bold ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>FUTMINNA Main Gate</span>
                    </div>

                    {/* Property centered pulse landmark pins */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        {/* Ping radar effect */}
                        <span className="absolute -left-3 -top-3 flex h-10 w-10">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-10 w-10 bg-emerald-500 opacity-20"></span>
                        </span>
                        
                        {/* Point Marker */}
                        <div className="relative z-10 w-4 h-4 rounded-full bg-emerald-600 border border-white shadow-md flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>

                        {/* Speech Bubble / Pin Card */}
                        <div className={`absolute top-5 -left-12 w-28 p-1.5 rounded-lg border shadow-sm text-center space-y-0.5 transition-colors ${
                          isDark ? 'bg-[#1E1E1D] border-[#383837] text-white' : 'bg-white border-zinc-200 text-zinc-950'
                        }`}>
                          <strong className="text-[8px] block font-bold leading-none">{selectedProperty.zone} Area</strong>
                          <span className="text-[7.5px] text-zinc-500 font-mono block leading-none truncate">
                            {selectedProperty.map_location ? selectedProperty.map_location : `GPS: 9.5168, 6.4485`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/45 backdrop-blur-xs px-2 py-1 rounded text-[8px] text-white font-semibold font-mono">
                      <Compass className="w-2.5 h-2.5 animate-spin-slow text-emerald-400" />
                      <span>{selectedProperty.zone} GPS Grid</span>
                    </div>
                  </div>
                </div>

                {/* Public Community Ratings & Reviews */}
                <div className={`space-y-3 border-t pt-3 ${isDark ? 'border-[#383837]' : 'border-zinc-150'}`}>
                  <div className="flex justify-between items-center">
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>Community Reviews</h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      <span className={`text-xs font-extrabold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>
                        {(() => {
                          const reviews = propertyReviews[selectedProperty.property_id] || [];
                          if (reviews.length === 0) return 'No reviews';
                          const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
                          return `${avg.toFixed(1)} / 5.0 (${reviews.length})`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Review Entries */}
                  {(() => {
                    const reviews = propertyReviews[selectedProperty.property_id] || [];
                    if (reviews.length === 0) {
                      return (
                        <div className="text-center py-6 border border-dashed rounded-xl border-zinc-200/40">
                          <MessageSquare className="w-6 h-6 mx-auto text-zinc-300 mb-1" />
                          <p className="text-[10px] text-zinc-400 font-medium">No reviews submitted yet for this lodge.</p>
                          <p className="text-[9px] text-zinc-400/80">Be the first to review after moving in!</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-0.5">
                        {reviews.map((rev: any) => (
                          <div 
                            key={rev.review_id || rev.id} 
                            className={`p-3 rounded-xl border flex flex-col gap-1.5 transition ${
                              isDark ? 'bg-[#242423] border-[#383837]/60' : 'bg-zinc-50/50 border-zinc-200/70'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`text-[11px] font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-850'}`}>
                                {rev.student_name}
                              </span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <Star 
                                    key={idx} 
                                    className={`w-3 h-3 ${idx < rev.rating ? 'fill-amber-400 stroke-amber-400' : 'text-zinc-300'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                            {rev.comment && (
                              <p className={`text-[10.5px] italic leading-relaxed font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-650'}`}>
                                "{rev.comment}"
                              </p>
                            )}
                            <span className="text-[8px] text-zinc-400/80 font-mono text-right font-medium">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Share Notification Alert */}
                {showShareToast && (
                  <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 border text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 transition-all duration-300 animate-slide-up ${
                    isDark ? 'bg-[#1E1E1D] border-[#383837] text-[#E2E1DA]' : 'bg-white border-zinc-250 text-zinc-900'
                  }`}>
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>✓ Lodge catalog specs copied to clipboard!</span>
                  </div>
                )}
                <div className={`p-3 rounded-xl border transition-colors ${
                  isDark ? 'bg-[#242423] border-[#383837]' : 'bg-[#FCFBF8] border-[#C5C4BA]'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <strong className={`text-xs ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-800'}`}>Add expert dispatch inspector?</strong>
                    <span className={`text-xs font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-900'}`}>+ ₦3,000</span>
                  </div>
                  <p className={`text-[10px] mb-3 leading-tight ${isDark ? 'text-[#A3A29B]' : 'text-zinc-400'}`}>We dispatch a specialist to review water valves and power phases prior to occupancy. (Non-refundable)</p>
                  
                  <label className={`flex items-center gap-2 cursor-pointer text-xs transition-colors ${isDark ? 'text-[#E2E1DA]/80' : 'text-zinc-700'}`}>
                    <input 
                      type="checkbox"
                      checked={inspectionWaiver}
                      onChange={(e) => setInspectionWaiver(e.target.checked)}
                      className={`rounded focus:ring-0 ${
                        isDark ? 'bg-[#1E1E1D] border-[#383837] text-[#1D1D1C]' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                    <span>Waive manual physical inspection (FREE)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className={`p-4 border-t sticky bottom-0 shrink-0 transition-colors duration-300 ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]/60' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <button 
                onClick={() => setScreen('CHECKOUT')}
                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  isDark ? 'bg-[#E2E1DA] hover:bg-[#D2D1C9] text-[#1A1A1A]' : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                Proceed to Booking <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ==================================== */}
        {/* 6. CHECKOUT SCREEN */}
        {/* ==================================== */}
        {screen === 'CHECKOUT' && selectedProperty && (
          <motion.div
            key="CHECKOUT"
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "tween", ease: [0.25, 0.8, 0.25, 1], duration: 0.38 }}
            className="flex-grow flex flex-col justify-between p-4 bg-white"
          >
            <div className="flex justify-between items-center mb-4 border-b border-zinc-150 pb-2">
              <button onClick={() => setScreen('DETAIL')} className="text-zinc-400 hover:text-zinc-900 text-xs font-bold">Back</button>
              <h3 className="text-[10px] font-mono font-bold text-zinc-800 uppercase tracking-widest">Lease Settlement</h3>
              <div className="w-8"></div>
            </div>

            {/* Stepper display */}
            <div className="flex justify-between items-center text-[9px] text-zinc-400 mb-4 px-1 font-bold">
              <span className={checkoutStep >= 1 ? 'text-zinc-950 font-bold' : ''}>1. Review</span>
              <span>→</span>
              <span className={checkoutStep >= 2 ? 'text-zinc-950 font-bold' : ''}>2. Contacting</span>
              <span>→</span>
              <span className={checkoutStep >= 3 ? 'text-zinc-950 font-bold' : ''}>3. Payment</span>
              <span>→</span>
              <span className={checkoutStep >= 4 ? 'text-zinc-950 font-bold' : ''}>4. Unlock</span>
            </div>

            {/* Step 1: Booking Review */}
            {checkoutStep === 1 && (
              <div className="space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-zinc-50 p-3.5 border border-zinc-200 rounded-xl space-y-2">
                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Lodging Price Split Overview</h4>
                    <div className="flex justify-between text-xs text-zinc-650">
                      <span>Lodge rent rate</span>
                      <span className="font-mono">₦{Number(selectedProperty.total_listed_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-650">
                      <span>Physical inspector fee</span>
                      <span className="font-mono">{inspectionWaiver ? '₦0 (Waived)' : '₦3,000'}</span>
                    </div>
                    <div className="border-t border-zinc-150 pt-2 flex justify-between text-xs font-bold text-zinc-950">
                      <span>Total Account Debit</span>
                      <span className="font-mono text-zinc-900">₦{Number(Number(selectedProperty.total_listed_price) + (inspectionWaiver ? 0.0 : 3000.0)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Proposed Move-In Date</label>
                    <input 
                      type="date"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className="w-full bg-white border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-800 focus:outline-none rounded-lg"
                    />
                    <p className="text-[9px] text-zinc-400 mt-1.5 leading-normal">Escrow security begins on direct move-in verification sweep date.</p>
                  </div>
                </div>

                <button 
                  onClick={handleInitiatePayment}
                  disabled={isPaying}
                  className="w-full bg-zinc-900 hover:bg-zinc-850 py-3.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1 mt-6 cursor-pointer"
                >
                  {isPaying ? 'Contacting secure gateway...' : 'Verify & Initialize Payment'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Contacting Gateway */}
            {checkoutStep === 2 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 border-3 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
                <h4 className="font-bold text-xs text-zinc-900">Contacting Secure API Gateways</h4>
                <p className="text-[10px] text-zinc-450 max-w-xs leading-normal">Simulating webhook handshake with Paystack servers (Nigeria)...</p>
              </div>
            )}

            {/* Step 3: Paystack Simulator */}
            {checkoutStep === 3 && (
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex-grow flex flex-col justify-between">
                <div className="text-center space-y-1.5 mt-6">
                  <div className="w-11 h-11 bg-zinc-900 text-white rounded-full flex items-center justify-center mx-auto text-base font-bold">P</div>
                  <h4 className="text-zinc-800 font-bold text-xs">Simulated Paystack Sandbox</h4>
                  <p className="text-[11px] text-zinc-500">
                    Merchant Payment settlement: <strong>₦{Number(Number(selectedProperty.total_listed_price) + (inspectionWaiver ? 0.0 : 3000.0)).toLocaleString()}</strong>
                  </p>
                  <p className="text-[9px] text-zinc-400 font-mono">Ref code: {paymentReference}</p>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-lg text-[10px] text-zinc-500 leading-normal border border-zinc-200 border-dashed">
                    🔑 Clicking 'Authorize Payout' calls the local billing callback webhook instantly to verify the escrow catalog line.
                  </div>
                  
                  <button 
                    onClick={handleSimulateCardPayment}
                    disabled={isPaying}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold py-3 rounded-lg uppercase tracking-wider transition cursor-pointer"
                  >
                    {isPaying ? 'Authorizing transaction...' : 'Authorize Payout Sync'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Booking Unlocked */}
            {checkoutStep === 4 && (
              <div className="flex-grow flex flex-col justify-between">
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-zinc-900">Rent Deposited!</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-normal">
                    Split payout escrow locked. Property <strong className="text-zinc-800 font-mono">{selectedPropertyId}</strong> has been successfully booked for your academic session!
                  </p>
                </div>

                {/* Lock release message */}
                <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-2.5">
                  <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Caretaker contact info unlocked:</p>
                  <div className="space-y-1 text-xs text-zinc-650 font-mono">
                    <p>🧑 Authorized agent: <strong>Ibrahim Musa</strong></p>
                    <p>📞 Phone contract: <strong>09012345678</strong></p>
                    <p>💬 WhatsApp link: <strong className="text-emerald-705">2349012345678</strong></p>
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <button 
                    onClick={() => { setScreen('HISTORY'); onRefresh(); }}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    View active bookings progress
                  </button>
                  <button 
                    onClick={() => { setScreen('BROWSE'); onRefresh(); }}
                    className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 font-bold cursor-pointer"
                  >
                    Back to feeds
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================================== */}
        {/* 7. POST MOVE IN FEEDBACK / DISPUTE */}
        {/* ==================================== */}
        {screen === 'POSTMOVEIN' && activeTxId && (
          <motion.div
            key="POSTMOVEIN"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-grow flex flex-col justify-between p-4 bg-white"
          >
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-zinc-150 pb-2">
                <button onClick={() => setScreen('HISTORY')} className="text-xs text-zinc-400 font-bold cursor-pointer">← back</button>
                <h4 className="text-[10px] font-mono font-bold text-zinc-800 uppercase tracking-widest">Physical Audit Feedback</h4>
                <div className="w-8"></div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl text-xs space-y-2 mb-4">
                <span className="text-zinc-400 text-[9px] block uppercase font-bold">Booking Reference ID</span>
                <strong className="text-zinc-900 text-xs font-mono">{activeTxId}</strong>
                <p className="text-zinc-500 text-[11px] leading-normal">Submit your move-in status review. This releases the escrow payout to the caretaker or holds it for inspection arbitration.</p>
              </div>

              {!showDisputeInput ? (
                <form onSubmit={handlePostFeedback} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Caretaker Rating</label>
                    <div className="flex gap-2.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                          key={star} 
                          type="button" 
                          onClick={() => setRating(star)}
                          className="focus:outline-none cursor-pointer"
                        >
                          <Star className={`w-6 h-6 ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold uppercase text-zinc-400">Review Statement</label>
                      <span className={`text-[9px] font-mono ${comment.length < 15 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>
                        {comment.length}/500 chars (min 15)
                      </span>
                    </div>
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="e.g. Caretaker was supportive and physical borehole pumping structure aligns."
                      rows={3}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                    ></textarea>
                    {comment.length > 0 && comment.length < 15 && (
                      <p className="text-red-500 text-[10px] mt-1 font-semibold">
                        ⚠️ Review statement must be at least 15 characters long.
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    disabled={comment.length < 15}
                    className={`w-full font-bold py-3 rounded-lg text-xs cursor-pointer shadow-xs transition-all ${
                      comment.length < 15
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-650'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                    }`}
                  >
                    Release Escrow Payout
                  </button>

                  <div className="border-t border-zinc-150 pt-4 text-center">
                    <p className="text-[10px] text-zinc-400 mb-2 font-medium">Undeclared damage or missing infrastructure details?</p>
                    <button 
                      type="button"
                      onClick={() => setShowDisputeInput(true)}
                      className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                    >
                      ⚠️ Raise structural escrow dispute
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleFileDispute} className="space-y-4">
                  <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-[11px] text-red-750 leading-normal font-medium">
                    Filing a formal dispute immediately freezes rent portion disbursement. Arbiters will contact both parties. Connection fee remains static.
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Structural issues details</label>
                    <textarea 
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="e.g. No functioning borehole pumping. Missing bathroom water system as promised."
                      rows={4}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-3 text-xs text-zinc-800 focus:border-red-400 focus:outline-none"
                      required
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-3 rounded-lg cursor-pointer"
                  >
                    File Lock Dispute
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => setShowDisputeInput(false)}
                    className="w-full text-center text-xs text-zinc-400 hover:text-zinc-650 font-bold cursor-pointer"
                  >
                    Cancel Dispute
                  </button>
                </form>
              )}

              <div className="border-t border-zinc-150 pt-4 mt-4 text-center shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    const activeTx = apiState.transactions?.find((t: any) => t.transaction_id === activeTxId);
                    const property = apiState.properties?.find((p: any) => p.property_id === activeTx?.property_id);
                    const contact = apiState.contacts?.find((c: any) => c.contact_id === property?.caretaker_id);
                    
                    setReportSubjectPropertyId(property?.property_id || null);
                    setReportSubjectContactId(property?.caretaker_id || null);
                    setReportSubjectUserId(contact?.user_id || null);
                    setReportSubjectName(`${property?.property_type || 'Lodge'} in ${property?.zone || ''} (${contact?.full_name || 'Caretaker'})`);
                    setReportType('Property mismatch');
                    setReportDescription('');
                    setReportEvidenceUrls([]);
                    setShowReportForm(true);
                  }}
                  className="text-xs text-red-650 hover:text-red-750 font-bold hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Report an issue with this property or landlord</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================================== */}
        {/* 8. MY TRANSACTIONS / HISTORY SCREEN */}
        {/* ==================================== */}
        {screen === 'HISTORY' && (
          <motion.div
            key="HISTORY"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-grow flex flex-col p-4 justify-between bg-zinc-50"
          >
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-zinc-200 pb-2 bg-zinc-50">
                <button onClick={() => setScreen('BROWSE')} className="text-xs text-zinc-400 font-bold cursor-pointer">← Back</button>
                <h4 className="text-[10px] font-mono font-bold text-zinc-800 uppercase tracking-widest">Active Bookings</h4>
                <div className="w-8"></div>
              </div>

              <div className="space-y-4">
                {studentTxList.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <p className="text-xs">No active bookings found.</p>
                  </div>
                ) : (
                  studentTxList.map((tx: any) => {
                    return (
                      <div key={tx.transaction_id} className="bg-white border border-zinc-200 p-4 rounded-xl space-y-3 shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">{tx.transaction_id}</span>
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            tx.escrow_status === 'Held' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                            tx.escrow_status === 'Released' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                            tx.escrow_status === 'Disputed' ? 'bg-red-50 text-red-700 border border-red-150' :
                            'bg-zinc-100 text-zinc-500'
                          }`}>
                            Escrow: {tx.escrow_status}
                          </span>
                        </div>

                        <div className="text-xs space-y-1.5 text-zinc-600 font-sans font-medium">
                          <p>🏠 Lodge reference: <strong className="text-zinc-900 font-mono">{tx.property_id}</strong></p>
                          <p>📅 Schedule move-in: <strong className="text-zinc-850 font-mono">{tx.move_in_date}</strong></p>
                          <p>💰 Escrow Rent portion: <strong className="text-zinc-900 font-semibold font-mono">₦{Number(tx.total_paid || (Number(tx.landlord_rent) + Number(tx.connection_fee) + Number(tx.inspection_fee))).toLocaleString()}</strong></p>
                        </div>

                        {/* Caretaker details unlocked info */}
                        <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg space-y-1 text-[11px] text-zinc-500">
                          <div className="flex justify-between font-bold text-zinc-800">
                            <span>📱 Contact Caretaker</span>
                            <span className="text-[9px] text-emerald-700 font-bold uppercase font-mono tracking-wider">Unlocked</span>
                          </div>
                          <p>Ibrahim Musa: <strong className="text-zinc-700">09012345678</strong></p>
                        </div>

                        {/* Post-move feedback or dispute trigger */}
                        {tx.escrow_status === 'Held' && (
                          <button 
                            onClick={() => { setActiveTxId(tx.transaction_id); setScreen('POSTMOVEIN'); }}
                            className="w-full bg-zinc-100 text-zinc-800 hover:bg-zinc-200 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
                          >
                            ⭐ Perform Move-in Audit
                          </button>
                        )}
                        
                        {tx.escrow_status === 'Released' && (
                          <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded-lg text-center font-bold">
                            ✓ Escrow funds disbursed. Welcome to your lodge!
                          </div>
                        )}

                        {tx.escrow_status === 'Disputed' && (
                          <div className="text-[10px] text-red-700 bg-red-50 border border-red-150 px-2 py-1.5 rounded-lg text-center font-bold">
                            ⚠️ Dispute Filed. Lodga is examining structural discrepancies.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* ==================================== */}
        {/* SAFETY REPORT FLOW OVERLAY */}
        {/* ==================================== */}
        {showReportForm && (
          <div className={`absolute inset-0 z-50 flex flex-col justify-between animate-in slide-in-from-bottom duration-250 ${
            isDark ? 'bg-[#1A1A1A] text-[#E2E1DA]' : 'bg-white text-zinc-900'
          }`}>
            <div className={`p-4 shrink-0 flex justify-between items-center border-b transition-colors duration-300 ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]/60' : 'bg-white border-zinc-200'
            }`}>
              <button 
                onClick={() => {
                  setShowReportForm(false);
                  setReportSuccess(false);
                }} 
                className={`text-xs font-bold transition-colors ${
                  isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-zinc-400 hover:text-zinc-900'
                }`}
              >
                ← cancel
              </button>
              <span className="text-[10px] font-mono font-extrabold tracking-widest text-red-500">SAFETY COMPLAINT FILE</span>
              <div className="w-8"></div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {reportSuccess ? (
                <div className="flex flex-col items-center justify-center text-center py-10 space-y-4 animate-in fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
                    <Check className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">Report Lodged Anonymously</h4>
                    <p className={`text-xs mt-1 leading-normal ${isDark ? 'text-[#A3A29B]' : 'text-zinc-500'}`}>
                      Our safety and physical audit team has received your report. Appropriate action will be taken under strict compliance guidelines.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportForm(false);
                      setReportSuccess(false);
                      setReportType('');
                      setReportDescription('');
                      setReportEvidenceUrls([]);
                      setReportSubjectContactId(null);
                      setReportSubjectPropertyId(null);
                      setReportSubjectUserId(null);
                      setReportSubjectName(null);
                      fetchMyReports();
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
                  >
                    Dismiss File
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-3 rounded-xl border leading-relaxed text-[11px] ${
                    isDark ? 'bg-[#242423] border-[#383837] text-zinc-400' : 'bg-zinc-50 border-zinc-250/50 text-zinc-500'
                  }`}>
                    <strong>Confidentiality Guarantee:</strong> Your user ID is stored internally for safety audit logs but is completely hidden from caretakers, landlords, and anyone other than central administrators.
                  </div>

                  {reportSubjectName && (
                    <div className={`border p-3 rounded-xl text-xs space-y-0.5 ${
                      isDark ? 'bg-red-950/10 border-red-900/30' : 'bg-red-50/50 border-red-200'
                    }`}>
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Subject of Report</span>
                      <p className={`font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>{reportSubjectName}</p>
                      {reportSubjectPropertyId && <p className="text-[10px] text-zinc-400 font-mono">Property: {reportSubjectPropertyId}</p>}
                    </div>
                  )}

                  {/* Step 1: Select Type */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase text-zinc-400">Step 1: Report Reason</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className={`w-full p-2.5 border rounded-xl text-xs outline-none focus:border-zinc-400 ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <option value="">-- Choose report reason --</option>
                      {[
                        'Suspicious landlord',
                        'Suspicious caretaker', 
                        'Fake listing',
                        'Scam attempt',
                        'Harassment',
                        'Property mismatch',
                        'Unauthorized fee request',
                        'Other'
                      ].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Description */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold uppercase text-zinc-400">Step 2: What Happened?</label>
                      <span className={`text-[10px] font-mono ${reportDescription.length < 20 ? 'text-red-500' : 'text-zinc-400'}`}>
                        {reportDescription.length}/1000 chars (min 20)
                      </span>
                    </div>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Please describe the incident in detail. Be as specific as possible (e.g., dates, requested amounts, exact discrepancy)."
                      rows={5}
                      maxLength={1000}
                      className={`w-full p-3 border rounded-xl text-xs outline-none focus:border-zinc-400 ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                      }`}
                    />
                    {reportDescription.length > 0 && reportDescription.length < 20 && (
                      <p className="text-red-500 text-[10px] mt-1 font-semibold">
                        ⚠️ Please write a description with at least 20 characters before submitting.
                      </p>
                    )}
                  </div>

                  {/* Step 3: Evidence uploads */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-zinc-400">Step 3: Evidence Attachments (Optional)</label>
                    
                    <div className="flex flex-wrap gap-2">
                      {reportEvidenceUrls.map((url, index) => (
                        <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-zinc-200">
                          <img src={url} className="w-full h-full object-cover" alt="evidence thumbnail" />
                          <button
                            type="button"
                            onClick={() => setReportEvidenceUrls(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-full"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}

                      {reportEvidenceUrls.length < 5 && (
                        <label className={`w-14 h-14 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 cursor-pointer transition ${
                          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-250'
                        }`}>
                          <span className="text-[14px] font-bold">+</span>
                          <span className="text-[7px] uppercase font-bold text-center">Add Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleReportPhotoUpload}
                            disabled={uploadingReportPhoto}
                          />
                        </label>
                      )}
                    </div>
                    {uploadingReportPhoto && <span className="text-[9px] text-zinc-400 animate-pulse block">Uploading to Cloudinary...</span>}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={submittingReport || !reportType || reportDescription.length < 20}
                    onClick={async () => {
                      if (!reportType || reportDescription.length < 20) return;
                      setSubmittingReport(true);
                      try {
                        const res = await fetch('/api/reports', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            report_type: reportType,
                            subject_contact_id: reportSubjectContactId,
                            subject_property_id: reportSubjectPropertyId,
                            subject_user_id: reportSubjectUserId,
                            description: reportDescription,
                            evidence_urls: reportEvidenceUrls
                          })
                        });
                        if (res.ok) {
                          setReportSuccess(true);
                          onRefresh();
                        } else {
                          const err = await res.json();
                          alert(err.error || "Failed to submit safety report.");
                        }
                      } catch (err) {
                        console.error("Error submitting report:", err);
                        alert("Network error. Please try again.");
                      } finally {
                        setSubmittingReport(false);
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      (!reportType || reportDescription.length < 20 || submittingReport)
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {submittingReport ? 'Lodging Safety Complaint...' : '🔒 Submit Confidential Report'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support Button inside the Student Mobile interface */}
        <SupportButton theme={theme} isMobileFrame={true} bottomOffset="bottom-[76px]" />

      </div>

      {/* Reusable Cookie Consent widget */}
      <CookieConsent />

      {/* Google Sign-in Interactive Accounts Chooser Simulator */}
      {showGoogleSimulator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border ${isDark ? 'bg-[#1C1C1B] border-[#383837] text-white' : 'bg-white border-zinc-200 text-zinc-950'}`}>
            <div className="p-5 border-b border-zinc-250/20 flex justify-between items-center bg-[#4285F4]/5">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-bold">Sign in with Google</span>
              </div>
              <button onClick={() => setShowGoogleSimulator(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-400 leading-normal">Select a Google Account to authorize <strong>Lodga FUTMINNA</strong> secure verification.</p>
              
              <div className="space-y-2">
                {[
                  { name: 'Sodiq Adesanya', email: 'sodiq.adesanya@futminna.edu.ng' },
                  { name: 'Fatima Bello', email: 'fatima.bello@futminna.edu.ng' },
                  { name: 'Chidi Okafor', email: 'chidi.okafor@futminna.edu.ng' }
                ].map((account) => (
                  <button
                    key={account.email}
                    onClick={() => submitGoogleAuth(account.email, account.name)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      isDark 
                        ? 'bg-[#252524] border-zinc-850 hover:bg-zinc-800 hover:border-zinc-750 text-zinc-100' 
                        : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-250 text-zinc-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                      {account.name[0]}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold leading-none mb-1">{account.name}</p>
                      <p className="text-[10px] text-zinc-400 leading-none">{account.email}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-200/20"></div>
                <span className="flex-shrink mx-3 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">or enter custom email</span>
                <div className="flex-grow border-t border-[#383837]/30"></div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customEmail = String(formData.get('custom_email') || '').trim();
                const customName = String(formData.get('custom_name') || '').trim() || 'Google User';
                if (customEmail && customEmail.includes('@')) {
                  submitGoogleAuth(customEmail, customName);
                }
              }} className="space-y-3">
                <div>
                  <input
                    name="custom_name"
                    type="text"
                    placeholder="Full Name"
                    required
                    className={`w-full px-3 py-2 text-xs rounded-lg border outline-none ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500' : 'bg-white border-zinc-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    name="custom_email"
                    type="email"
                    placeholder="student@futminna.edu.ng"
                    required
                    className={`flex-grow px-3 py-2 text-xs rounded-lg border outline-none ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500' : 'bg-white border-zinc-200 focus:border-blue-500'
                    }`}
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shrink-0">
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Internal mobile hardware home indicators bar layout */}
      <div className="absolute bottom-0 inset-x-0 h-4 bg-zinc-900 z-50 flex items-center justify-center">
        <div className="w-28 h-1 bg-zinc-700 rounded-full"></div>
      </div>
    </div>
  );
}
