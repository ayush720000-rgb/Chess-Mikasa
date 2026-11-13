import React, { useState, useRef } from 'react';
import { X, User as UserIcon, Upload } from 'lucide-react';
import { UserProfile } from '../types/chess';
import { saveUserProfile, isTelegramWebApp, generateInitialAvatar, triggerHaptic } from '../utils/telegram';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSave: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || generateInitialAvatar(currentUser.name));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTg = isTelegramWebApp();

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseInitialsAvatar = () => {
    triggerHaptic('light');
    const generated = generateInitialAvatar(name.trim() || 'Grandmaster');
    setAvatarUrl(generated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    const cleanName = name.trim() || 'Grandmaster';
    const updated: UserProfile = {
      ...currentUser,
      name: cleanName,
      avatarUrl: avatarUrl || generateInitialAvatar(cleanName),
    };
    saveUserProfile(updated);
    window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: updated }));
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="clay-card w-full max-w-md p-5 sm:p-6 relative border border-[#e5b869]/35 bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-y-auto max-h-[92dvh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-[#ffd88c] font-semibold">
            Player Settings
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white mt-0.5">Player Profile</h2>
          {isTg && (
            <p className="text-xs text-[#ffd88c] mt-1">
              Synced with Telegram. Customize your player name and avatar picture anytime.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="w-full bg-[#141414] border border-zinc-800 focus:border-[#e5b869] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-400">
                Profile Picture (DP)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#ffd88c] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Current Selected Avatar Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080808] border border-zinc-800 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#181818] border-2 border-[#e5b869] shrink-0 shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 m-auto text-zinc-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">Current Avatar</span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  Shown in match, board bar, and Telegram reactions
                </span>
              </div>
              <button
                type="button"
                onClick={handleUseInitialsAvatar}
                className="clay-button px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white shrink-0 cursor-pointer"
              >
                Use Initials
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="clay-button px-4 py-2 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="clay-button-primary px-5 py-2 text-xs rounded-xl font-bold cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
