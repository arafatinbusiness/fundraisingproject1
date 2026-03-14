import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, AlertCircle, ExternalLink } from 'lucide-react';

export const Auth: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    
    // Check if running on localhost for development
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.startsWith('192.168.');
    
    if (isLocalhost) {
      // For local development, show specific instructions
      setError(`লোকাল ডেভেলপমেন্ট: ${window.location.hostname} ডোমেইনে Firebase Authentication কাজ করবে না। প্রোডাকশন ডেপ্লয়মেন্টের জন্য নিচের নির্দেশনা অনুসরণ করুন:`);
      setIsLoading(false);
      return;
    }
    
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Check for unauthorized domain error
      if (error?.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`ডোমেইন অথোরাইজেশন সমস্যা: ${currentDomain} ডোমেইনটি Firebase Authentication-এ যুক্ত নেই। দয়া নিচের নির্দেশনা অনুসরণ করুন:`);
      } else {
        setError('লগইন ব্যর্থ হয়েছে। দয়া আবার চেষ্টা করুন।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openFirebaseConsole = () => {
    window.open('https://console.firebase.google.com/', '_blank');
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6">
        <LogIn size={40} />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">স্বাগতম!</h2>
      <p className="text-slate-600 mb-8 max-w-md">
        তহবিল ব্যবস্থাপনা অ্যাপে প্রবেশ করতে আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
      </p>
      
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="flex items-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div>
            লোড হচ্ছে...
          </>
        ) : (
          <>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            গুগল দিয়ে লগইন করুন
          </>
        )}
      </button>

      {error && (
        <div className="mt-8 max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 mb-2">লগইন সমস্যা</h3>
                <p className="text-red-700 text-sm mb-3">{error}</p>
                
                {error.includes('ডোমেইন অথোরাইজেশন সমস্যা') && (
                  <div className="bg-white border border-red-100 rounded-lg p-3 mb-3">
                    <h4 className="font-medium text-slate-800 mb-2 text-sm">ফিক্স করার স্টেপস:</h4>
                    <ol className="text-slate-700 text-sm space-y-2 list-decimal pl-4">
                      <li>Firebase Console-এ লগইন করুন</li>
                      <li>প্রোজেক্ট সিলেক্ট করুন: <strong>fundingproject1</strong></li>
                      <li>Authentication → Settings → Authorized domains-এ যান</li>
                      <li><strong>{window.location.hostname}</strong> ডোমেইনটি অ্যাড করুন</li>
                      <li>Save করুন এবং কিছুক্ষণ অপেক্ষা করুন</li>
                    </ol>
                  </div>
                )}
                
                <button
                  onClick={openFirebaseConsole}
                  className="flex items-center gap-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  <ExternalLink size={14} />
                  Firebase Console-এ যান
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
