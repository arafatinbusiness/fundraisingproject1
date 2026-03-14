import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn } from 'lucide-react';

export const Auth: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
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
        className="flex items-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-all shadow-sm active:scale-95"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        গুগল দিয়ে লগইন করুন
      </button>
    </div>
  );
};
