import React, { useState } from 'react';
import { X, Check, RotateCcw, Edit2 } from 'lucide-react';
import type { GradeOption } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/gpa';

interface GradingScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: GradeOption[];
  onSaveScale: (newScale: GradeOption[]) => void;
  editable?: boolean;
}

export const GradingScaleModal: React.FC<GradingScaleModalProps> = ({
  isOpen,
  onClose,
  scale,
  onSaveScale,
  editable = true
}) => {
  const [currentScale, setCurrentScale] = useState<GradeOption[]>(scale);

  if (!isOpen) return null;

  const handleChangePoint = (index: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...currentScale];
    updated[index] = { ...updated[index], grade_point: isNaN(num) ? 0 : num };
    setCurrentScale(updated);
  };

  const handleResetDefault = () => {
    setCurrentScale(DEFAULT_GRADING_SCALE);
  };

  const handleSave = () => {
    onSaveScale(currentScale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold">Configurable Grading Scale</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          <p className="text-sm text-slate-600">
            Adjust the grade point values to match your university's official grading scale rules (Default 4.0 scale).
          </p>

          <div className="grid grid-cols-2 gap-3">
            {currentScale.map((item, idx) => (
              <div key={item.grade} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-sm px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                  {item.grade}
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-slate-400">Points:</span>
                  {editable ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={item.grade_point}
                      onChange={(e) => handleChangePoint(idx, e.target.value)}
                      className="w-16 px-2 py-1 text-right text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-900">{item.grade_point.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          {editable ? (
            <button
              onClick={handleResetDefault}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default (4.0)</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            {editable && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Save Scale</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
