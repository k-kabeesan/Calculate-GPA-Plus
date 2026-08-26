import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Share2, Shield, QrCode, Download, Send } from 'lucide-react';

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
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/#profile-${profileId}`;
  const whatsappText = `Calculate your GPA using this shared academic profile: "${profileName}"\n${shareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: profileName || 'Shared GPA Profile',
          text: `Calculate your GPA using "${profileName}"`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      handleCopy();
    }
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

          {/* Action Buttons: Copy, WhatsApp, Share, QR Code */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleCopy}
              className={`p-2.5 rounded-xl font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                copied ? 'bg-emerald-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
            >
              <Send className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={handleNativeShare}
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl border border-purple-200 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all"
            >
              <Share2 className="w-4 h-4 text-purple-600" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setShowQr(!showQr)}
              className={`p-2.5 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                showQr ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code</span>
            </button>
          </div>

          {/* QR Code Container */}
          {showQr && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3 animate-fade-in">
              <span className="text-xs font-bold text-slate-700">Scan QR Code to Open Profile Directly</span>
              <img
                src={qrImageUrl}
                alt={`QR Code for ${profileName}`}
                className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
              />
              <a
                href={qrImageUrl}
                download={`${profileId}_qr_code.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Code Image</span>
              </a>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Shareable Public Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none select-all"
              />
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
