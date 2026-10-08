import { useMemo, useState, type FormEvent } from 'react';
import { newId } from '@/app/ids';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { formatDateTime } from '@/components/format';
import {
  CONTACT_ERROR_LABELS,
  EMPTY_CONTACT_DRAFT,
  latestContactByLead,
  toContactUpdate,
  validateContactDraft,
  type ContactDraft,
  type ContactDraftError,
} from '@/domain/contacts';
import type { Lead } from '@/domain/types';

interface ContactCaptureProps {
  lead: Pick<Lead, 'id' | 'name'>;
}

const FIELDS: { key: keyof ContactDraft; label: string; type: string; autoComplete: string }[] = [
  { key: 'name', label: 'Name', type: 'text', autoComplete: 'off' },
  { key: 'role', label: 'Funktion', type: 'text', autoComplete: 'off' },
  { key: 'directDial', label: 'Durchwahl', type: 'tel', autoComplete: 'off' },
  { key: 'email', label: 'E-Mail', type: 'email', autoComplete: 'off' },
];

/**
 * Ansprechpartner aus dem Gespräch erfassen, ohne einen Kontakt in Salesforce anzulegen. Geht
 * mit dem Anrufprotokoll nach Salesforce, zusätzlich über den Kontakt-Export.
 */
export function ContactCapture({ lead }: ContactCaptureProps) {
  const contacts = useAppStore((s) => s.contacts);
  const addContact = useAppStore((s) => s.addContact);
  const latest = useMemo(() => latestContactByLead(contacts).get(lead.id), [contacts, lead.id]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [error, setError] = useState<ContactDraftError | null>(null);
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setDraft(EMPTY_CONTACT_DRAFT);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validateContactDraft(draft);
    setError(problem);
    if (problem || saving) return;
    setSaving(true);
    try {
      await addContact(toContactUpdate(draft, lead, newId(), new Date().toISOString()));
      close();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Kontakt erfassen" className="rounded border border-border bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
          Neu erfasster Kontakt
        </h3>
        {!open && (
          <Button onClick={() => setOpen(true)}>
            {latest ? 'Weiteren Kontakt erfassen' : 'Kontakt erfassen'}
          </Button>
        )}
      </div>

      {latest && !open && (
        <p className="mt-2 text-sm">
          <strong>{[latest.name, latest.role].filter(Boolean).join(', ') || 'ohne Namen'}</strong>
          {latest.directDial && <> · {latest.directDial}</>}
          {latest.email && <> · {latest.email}</>}
          <span className="text-muted"> · erfasst {formatDateTime(latest.capturedAt)}</span>
        </p>
      )}
      {!latest && !open && (
        <p className="mt-2 text-sm text-muted">
          Name, Funktion, Durchwahl oder E-Mail aus dem Gespräch. Steht im Anrufprotokoll in
          Salesforce, ohne einen Kontakt anzulegen.
        </p>
      )}

      {open && (
        <form onSubmit={(e) => void save(e)} noValidate className="mt-3 space-y-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
            {FIELDS.map((field) => (
              <label key={field.key} className="text-sm">
                <span className="mb-1 block text-xs text-muted">{field.label}</span>
                <input
                  id={`contact-${field.key}`}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  value={draft[field.key]}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                  className="w-full rounded border border-border bg-panel px-2 py-1"
                />
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm font-bold text-brand-primary">
              {CONTACT_ERROR_LABELS[error]}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              Kontakt speichern
            </Button>
            <Button onClick={close}>Abbrechen</Button>
          </div>
        </form>
      )}
    </section>
  );
}
