import { useState } from 'react';
import { HelpCircle, MessageSquare, Phone, Mail, X, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupportButtonProps {
  theme?: 'light' | 'dark';
  isMobileFrame?: boolean; // True when inside the simulated student mobile app
  bottomOffset?: string;
}

export default function SupportButton({ theme = 'light', isMobileFrame = false, bottomOffset }: SupportButtonProps) {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Retrieve contact values from Vite environment variables or clean defaults
  const supportPhone1 = import.meta.env.VITE_SUPPORT_PHONE_1 || '08105425053';
  const supportPhone2 = import.meta.env.VITE_SUPPORT_PHONE_2 || '09122489725';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'nglodga@gmail.com';

  const formatWhatsAppLink = (phone: string) => {
    // Strip leading 0 and prepend 234 (Nigeria)
    const cleanPhone = phone.startsWith('0') ? '234' + phone.slice(1) : phone;
    return `https://wa.me/${cleanPhone}?text=Hello%20Lodga%2520Support%252C%20I%20need%20help%20with%20a%20verified%20lodge%20lease.`;
  };

  const handlePhoneAction = async (phone: string) => {
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileBrowser || isMobileFrame) {
      window.open(`tel:${phone}`, '_self');
    } else {
      // Desktop copies number
      try {
        await navigator.clipboard.writeText(phone);
        setCopiedText(phone);
        setTimeout(() => setCopiedText(null), 2000);
      } catch (err) {
        console.error('Failed to copy number:', err);
      }
    }
  };

  const supportContent = (
    <div className={`p-5 rounded-2xl border shadow-2xl flex flex-col gap-4 text-xs ${
      isDark ? 'bg-[#1E1E1D] border-[#383837] text-[#E2E1DA]' : 'bg-white border-zinc-200 text-zinc-800'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Need help?</h3>
          <p className="text-[10px] text-zinc-400 mt-0.5">Lodga 24/7 Support Desk</p>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        {/* Support 1 */}
        <div className={`p-3 rounded-xl border flex flex-col gap-2 ${isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-150'}`}>
          <div className="flex justify-between items-center font-bold">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400">Support Agent 1</span>
            <span className="text-[10px] font-mono font-normal">{supportPhone1}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePhoneAction(supportPhone1)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-bold transition-all text-[10px] cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{copiedText === supportPhone1 ? 'Copied!' : 'Call Line'}</span>
            </button>
            <a
              href={formatWhatsAppLink(supportPhone1)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba56] text-white font-bold transition-all text-[10px]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Support 2 */}
        <div className={`p-3 rounded-xl border flex flex-col gap-2 ${isDark ? 'bg-[#242423] border-[#383837]' : 'bg-zinc-50 border-zinc-150'}`}>
          <div className="flex justify-between items-center font-bold">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400">Support Agent 2</span>
            <span className="text-[10px] font-mono font-normal">{supportPhone2}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePhoneAction(supportPhone2)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-bold transition-all text-[10px] cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{copiedText === supportPhone2 ? 'Copied!' : 'Call Line'}</span>
            </button>
            <a
              href={formatWhatsAppLink(supportPhone2)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba56] text-white font-bold transition-all text-[10px]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Email */}
        <a
          href={`mailto:${supportEmail}?subject=Lodga%20Student%20Support%20Request`}
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            isDark ? 'bg-[#242423] border-[#383837] hover:bg-[#2d2d2c]' : 'bg-zinc-50 border-zinc-150 hover:bg-zinc-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[10px] uppercase tracking-wide">Email Support</p>
              <p className="text-[9px] text-zinc-400 font-mono">{supportEmail}</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-zinc-400 hover:text-zinc-600">Open Mailer →</span>
        </a>
      </div>

      {/* Note */}
      <p className={`text-[10px] text-center italic ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        "We typically respond within 2 hours during business hours"
      </p>
    </div>
  );

  if (isMobileFrame) {
    // Render inside simulated smartphone absolute box (bottom-right of phone container)
    return (
      <div className={`absolute ${bottomOffset || 'bottom-5'} right-5 z-40 flex flex-col items-end`}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="mb-2 w-72 shadow-xl"
            >
              {supportContent}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${
            isOpen || isHovered
              ? 'w-10 h-10 opacity-100 bg-[#E2E1DA] text-[#1A1A1A]'
              : 'w-6 h-6 opacity-40 bg-zinc-900/60 text-white/80 scale-90'
          }`}
        >
          <HelpCircle className={`transition-all duration-300 ${isOpen || isHovered ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
        </button>
      </div>
    );
  }

  // Render on the global desktop screen
  return (
    <div className="fixed bottom-6 right-6 z-45 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-3 w-80 shadow-2xl"
          >
            {supportContent}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl cursor-pointer transition-all duration-300 ${
          isOpen || isHovered 
            ? 'w-10 h-10 opacity-100 bg-emerald-600 scale-100 animate-none' 
            : 'w-6 h-6 opacity-30 scale-90 hover:scale-100'
        }`}
        title="Lodga Support"
      >
        <HelpCircle className={`transition-all duration-300 ${isOpen || isHovered ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
      </button>
    </div>
  );
}
