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
 * mit dem Anrufprotokoll nach Salesforce, zusätzlich über den Kontakt-Export. Sitzt in der Karte
 * Ansprechpartner; das Formular klappt dort auf.
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

  if (!open) {
    return (
      <section aria-label="Kontakt erfassen" className="space-y-2">
        {latest && (
          <p className="text-xs leading-snug">
            <span className="text-muted">Neu erfasst: </span>
            <strong>{[latest.name, latest.role].filter(Boolean).join(', ') || 'ohne Namen'}</strong>
            {latest.directDial && <> · {latest.directDial}</>}
            {latest.email && <> · {latest.email}</>}
            <span className="text-muted"> · {formatDateTime(latest.capturedAt)}</span>
          </p>
        )}
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          title="Name, Funktion, Durchwahl oder E-Mail aus dem Gespräch. Steht im Anrufprotokoll in Salesforce, ohne einen Kontakt anzulegen."
        >
          {latest ? 'Weiteren Kontakt erfassen' : 'Kontakt erfassen'}
        </Button>
      </section>
    );
  }

  return (
    <section aria-label="Kontakt erfassen">
      <form onSubmit={(e) => void save(e)} noValidate className="space-y-2.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
          {FIELDS.map((field) => (
            <label key={field.key} className="text-sm">
              <span className="mb-0.5 block text-xs text-muted">{field.label}</span>
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
          <Button type="submit" size="sm" variant="primary" disabled={saving}>
            Kontakt speichern
          </Button>
          <Button size="sm" onClick={close}>
            Abbrechen
          </Button>
        </div>
      </form>
    </section>
  );
}
