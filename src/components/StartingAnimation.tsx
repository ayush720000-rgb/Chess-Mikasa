import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Sparkles, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { getMascotImage } from '../utils/mascot';

interface StartingAnimationProps {
  onComplete: () => void;
  mascotSrc?: string;
}

export const StartingAnimation: React.FC<StartingAnimationProps> = ({
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentImage, setCurrentImage] = useState<string>(getMascotImage);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setCurrentImage(customEvent.detail);
      }
    };
    window.addEventListener('mascot_image_changed', handleUpdate);
    return () => window.removeEventListener('mascot_image_changed', handleUpdate);
  }, []);

  const handleFinish = () => {
    triggerHaptic('medium');
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 350);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] bg-[#000000] flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto"
        >
          {/* Ambient Lighting Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,184,105,0.14)_0%,rgba(0,0,0,0.98)_75%)] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

          {/* Main Container */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full my-auto py-6">
            {/* Mascot Avatar Card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20 }}
              className="relative mb-6"
            >
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-[#ffd88c] via-[#e5b869] to-[#c89547] shadow-[0_0_40px_rgba(229,184,105,0.35)] relative">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#121212] border-2 border-[#181818] relative">
                  <img
                    src={currentImage}
                    alt="Mikasa Mascot"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/mikasa.jpg';
                    }}
                  />
                </div>

                {/* Corner Chess Emblem */}
                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-[#141414] border-2 border-[#e5b869] flex items-center justify-center text-lg shadow-lg">
                  ♟️
                </div>
              </div>
            </motion.div>

            {/* Kicker Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5b869]/15 border border-[#e5b869]/30 text-[#ffd88c] text-[11px] font-bold tracking-widest uppercase mb-3 shadow-inner"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Official Arena</span>
              <Sparkles className="w-3.5 h-3.5" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#ffd88c] to-[#e5b869] tracking-tight px-2 break-words max-w-full leading-tight font-serif"
            >
              Welcome To Mikasa Chess
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-xs sm:text-sm text-zinc-400 mt-2 tracking-wide font-medium px-4"
            >
              Master the board · Defend the realm · Claim victory
            </motion.p>

            {/* Enter Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-7 w-full max-w-xs px-2"
            >
              <button
                type="button"
                onClick={handleFinish}
                className="clay-button-primary w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-transform"
              >
                <span>Enter The Arena</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
