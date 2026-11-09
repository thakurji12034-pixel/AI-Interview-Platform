import { useState } from 'react';
import { createInterview, errorMessage } from '../api/interviews';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

const pad = (n) => String(n).padStart(2, '0');
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ScheduleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    candidateEmail: '',
    title: '',
    scheduledAt: '',
    durationMinutes: 60,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await createInterview({
        candidateEmail: form.candidateEmail,
        title: form.title,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Schedule an interview</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Candidate email</label>
          <input name="candidateEmail" type="email" value={form.candidateEmail} onChange={onChange} placeholder="candidate@example.com" className={inputClass} required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Interview title</label>
          <input name="title" value={form.title} onChange={onChange} placeholder="e.g. Backend round 1" className={inputClass} minLength={3} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date and time</label>
            <input name="scheduledAt" type="datetime-local" min={nowLocal()} value={form.scheduledAt} onChange={onChange} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
            <select name="durationMinutes" value={form.durationMinutes} onChange={onChange} className={inputClass}>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {busy ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}