import React, { useState } from 'react';
import { Download, X, User, MessageSquare } from 'lucide-react';

interface SaveProposalModalProps {
  onClose: () => void;
  onSaveProposal: (authorName: string, notes: string) => void;
  changesCount: number;
}

export const SaveProposalModal: React.FC<SaveProposalModalProps> = ({
  onClose,
  onSaveProposal,
  changesCount,
}) => {
  const [authorName, setAuthorName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) {
      alert('Please enter your name or nickname.');
      return;
    }
    onSaveProposal(authorName.trim(), notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">Save Assistant Proposals</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="font-semibold text-slate-300 block mb-1 text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Your name or nickname: <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Alex_K or Assistant"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 shadow-inner"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1 text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Comments or notes (optional):
            </label>
            <textarea
              rows={3}
              placeholder="Describe what was added, refined, or suggested..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 shadow-inner resize-none leading-relaxed"
            />
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-200/90 leading-relaxed">
            A proposal file named <code className="font-mono text-emerald-300 font-bold">assistant_proposal_{authorName ? authorName.replace(/[^a-zA-Z0-9_-]/g, '') : '&lt;Name&gt;'}.json</code> containing {changesCount} proposed changes will be downloaded to your device.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg transition shadow flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save &amp; Download Proposals</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
