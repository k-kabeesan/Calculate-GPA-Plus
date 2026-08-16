import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Share2, Shield } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  onOpenViewer?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  profileId,
  profileName,
  onOpenViewer
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/#profile-${profileId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Share2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Profile Share Link</h3>
              <p className="text-xs text-slate-400">Share "{profileName}" with students</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Profile ID</span>
            <div className="text-3xl font-black text-indigo-600 tracking-wider font-mono select-all">
              {profileId}
            </div>
            <p className="text-xs text-slate-500">
              Anyone with this ID or link can enter their results and calculate GPA.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Shareable Public Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5 shrink-0 transition-colors shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Student Result Isolation:</strong> When students open this link, they will see your predefined subjects and fixed credits. Their grade inputs will remain <strong>private to their browser</strong> and will not overwrite your profile data.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
          {onOpenViewer && (
            <button
              onClick={() => {
                onClose();
                onOpenViewer();
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
            >
              <span>Open Profile Now</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
