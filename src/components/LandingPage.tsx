import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ShieldCheck, Users, Wallet, Info, ArrowRight, Beef, Star, Quote } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      {/* Unique Editorial Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-end p-6 sm:p-12 overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/welcome-bg.jpg" 
            alt="Premium Beef" 
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-px w-12 bg-emerald-500" />
            <span className="text-emerald-500 font-black text-xs uppercase tracking-[0.3em]">Premium Community Fund</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-6xl sm:text-8xl font-black leading-[0.9] tracking-tighter uppercase"
          >
            সেরা মাংসের <br />
            <span className="text-emerald-500 italic font-serif normal-case tracking-normal">উৎসব</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-8 pt-4"
          >
            <button
              onClick={onLogin}
              className="group relative px-10 py-5 bg-white text-black font-black text-lg rounded-full overflow-hidden transition-all hover:pr-14 active:scale-95"
            >
              <span className="relative z-10">তহবিলে প্রবেশ করুন</span>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" size={24} />
            </button>
            
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <img 
                  key={i}
                  src={`https://picsum.photos/seed/user${i}/100/100`} 
                  className="w-12 h-12 rounded-full border-4 border-[#0a0a0a] object-cover"
                  alt="User"
                  referrerPolicy="no-referrer"
                />
              ))}
              <div className="w-12 h-12 rounded-full border-4 border-[#0a0a0a] bg-emerald-500 flex items-center justify-center text-[10px] font-black">
                +৫০
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Badge */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-12 right-12 hidden lg:flex w-32 h-32 border border-white/20 rounded-full items-center justify-center"
        >
          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-widest text-white/40">
            ESTABLISHED 2026 • PREMIUM QUALITY • 
          </div>
          <Beef className="text-emerald-500" size={32} />
        </motion.div>
      </section>

      {/* Visual Feature Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="aspect-[4/5] rounded-[3rem] overflow-hidden">
              <img 
                src="/images/section-bg.jpg" 
                alt="Community Feast" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 bg-emerald-600 p-8 rounded-[2rem] shadow-2xl hidden sm:block">
              <Quote className="text-white/40 mb-4" size={32} />
              <p className="text-xl font-bold italic max-w-[200px]">"একসাথে জমানো, একসাথে আনন্দ করা।"</p>
            </div>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                কেন আমাদের এই <br />
                <span className="text-emerald-500">বিশেষ উদ্যোগ?</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                আমরা বিশ্বাস করি উৎসবের আনন্দ সবার সাথে ভাগ করে নেওয়ায়। প্রতি মাসে সামান্য সঞ্চয় আমাদের পৌঁছে দেবে বছরের সেরা মাংসের স্বাদে।
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Wallet className="text-emerald-500" size={24} />
                </div>
                <h4 className="text-xl font-black">সহজ সঞ্চয়</h4>
                <p className="text-slate-500 text-sm">প্রতি মাসে আপনার সামর্থ্য অনুযায়ী জমা দিন। কোনো বাড়তি চাপ নেই।</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <ShieldCheck className="text-emerald-500" size={24} />
                </div>
                <h4 className="text-xl font-black">পূর্ণ স্বচ্ছতা</h4>
                <p className="text-slate-500 text-sm">আপনার প্রতিটি টাকার হিসাব অ্যাপের মাধ্যমে রিয়েল-টাইমে দেখুন।</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Steps Section */}
      <section className="py-24 bg-white text-black rounded-[4rem]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
              কিভাবে <br /> শুরু করবেন?
            </h2>
            <p className="max-w-xs text-slate-500 font-bold uppercase text-xs tracking-widest">
              মাত্র তিনটি সহজ ধাপে আপনিও হতে পারেন আমাদের এই উৎসবের অংশীদার।
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { 
                step: "০১", 
                title: "লগইন করুন", 
                desc: "গুগল অ্যাকাউন্ট দিয়ে দ্রুত সাইন-ইন করুন।",
                img: "/images/section-bg.jpg"
              },
              { 
                step: "০২", 
                title: "টাকা জমা", 
                desc: "অ্যাডমিনের কাছে আপনার কিস্তি জমা দিন।",
                img: "/images/section-bg.jpg"
              },
              { 
                step: "০৩", 
                title: "হিসাব দেখুন", 
                desc: "ড্যাশবোর্ডে আপনার জমার আপডেট দেখুন।",
                img: "/images/section-bg.jpg"
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="group space-y-6"
              >
                <div className="aspect-video rounded-3xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2">
                  <span className="text-emerald-600 font-black text-4xl">{item.step}</span>
                  <h4 className="text-2xl font-black">{item.title}</h4>
                  <p className="text-slate-500 font-medium">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Image */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/section-bg.jpg" 
            alt="Dining" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase">
            আপনি কি <br /> প্রস্তুত?
          </h2>
          <button
            onClick={onLogin}
            className="px-12 py-6 bg-emerald-500 text-black font-black text-xl rounded-full hover:scale-105 transition-transform shadow-2xl shadow-emerald-500/20"
          >
            এখনই যোগ দিন
          </button>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-black">ত</div>
          <span className="font-black tracking-widest uppercase text-xs">Fund Manager Pro</span>
        </div>
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
          © ২০২৬ গরুর মাংস তহবিল ব্যবস্থাপনা। সকল অধিকার সংরক্ষিত।
        </p>
      </footer>
    </div>
  );
};