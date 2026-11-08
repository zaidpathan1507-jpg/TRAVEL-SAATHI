import { useState } from 'react';
import { UserPlus, Trash2, Edit2, Phone, Star, Check, X } from 'lucide-react';
import { useSOS } from './SOSContext';
import { cx } from '../../lib/format';
import type { EmergencyContact } from './types';

import { validateEmergencyPhone } from './phoneValidation';

export function EmergencyContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { contacts, addContact, updateContact, deleteContact, setPrimaryContact } = useSOS();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRel, setFormRel] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formError, setFormError] = useState('');

  if (!open) return null;

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRel('');
    setFormIsPrimary(false);
    setFormError('');
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (c: EmergencyContact) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormRel(c.relationship);
    setFormIsPrimary(c.isPrimary);
    setIsAdding(false);
    setFormError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Contact name is required.');
      return;
    }
    const val = validateEmergencyPhone(formPhone);
    if (!val.isValid) {
      setFormError(val.error || 'Please enter a valid phone number.');
      return;
    }

    if (isAdding) {
      addContact({
        name: formName.trim(),
        phone: formPhone.trim(),
        relationship: formRel.trim() || 'Emergency Contact',
        isPrimary: formIsPrimary,
      });
    } else if (editingId) {
      updateContact(editingId, {
        name: formName.trim(),
        phone: formPhone.trim(),
        relationship: formRel.trim() || 'Emergency Contact',
        isPrimary: formIsPrimary,
      });
    }
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-lift animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600">
              <Phone size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink-950">Emergency Contacts</h3>
              <p className="text-[12px] text-ink-500">Notified instantly during SOS activation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Add / Edit Form */}
          {(isAdding || editingId) ? (
            <form onSubmit={handleSave} className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4 space-y-3">
              <div className="font-bold text-[14px] text-ink-900">
                {isAdding ? 'Add Emergency Contact' : 'Edit Contact'}
              </div>

              {formError && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-bold text-ink-700">Contact Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Aditi Sharma"
                  className="mt-1 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13.5px] font-medium text-ink-900 focus:border-red-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-ink-700">Phone Number *</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98220 12345"
                    className="mt-1 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13.5px] font-medium text-ink-900 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-ink-700">Relationship</label>
                  <input
                    type="text"
                    value={formRel}
                    onChange={(e) => setFormRel(e.target.value)}
                    placeholder="e.g. Family / Friend"
                    className="mt-1 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13.5px] font-medium text-ink-900 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 text-[13px] font-semibold text-ink-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPrimary}
                  onChange={(e) => setFormIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-red-600 focus:ring-red-500"
                />
                <span>Set as Primary Contact (called first during SOS)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 hover:bg-ink-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ink-950 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-ink-800"
                >
                  Save Contact
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-1.5 text-[12.5px] font-bold text-ink-800 hover:bg-ink-200 transition"
              >
                <UserPlus size={14} /> Add New Contact
              </button>
            </div>
          )}

          {/* Contact list */}
          <div className="space-y-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className={cx(
                  'flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition',
                  c.isPrimary ? 'border-red-300 bg-red-50/40' : 'border-ink-100 bg-white hover:border-ink-200'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-bold text-ink-950">{c.name}</span>
                    {c.isPrimary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10.5px] font-bold text-white">
                        <Star size={10} fill="currentColor" /> Primary
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-ink-600">
                    <span className="font-semibold text-ink-800">{c.phone}</span>
                    {c.relationship && ` · ${c.relationship}`}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!c.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryContact(c.id)}
                      title="Set as Primary"
                      className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                    >
                      <Star size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    title="Edit Contact"
                    className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                  >
                    <Edit2 size={15} />
                  </button>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteContact(c.id)}
                      title="Delete Contact"
                      className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-amber-50 p-3 text-[12px] text-amber-800 leading-relaxed">
            <b>Safety Notice:</b> Primary contacts receive 1-tap call priorities and pre-populated SMS/WhatsApp location alerts. In India, always dial <b>112</b> for state emergency responders.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-100 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-ink-950 px-5 py-2 text-[13.5px] font-bold text-white hover:bg-ink-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
