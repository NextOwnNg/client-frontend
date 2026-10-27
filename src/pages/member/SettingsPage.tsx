import { Button, toast } from '@heroui/react'
import { Phone } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckList } from '@/components/ui/ChoiceList'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { TextField } from '@/components/ui/TextField'
import { useDeleteRequest, useLogout, useMe, useUpdateMe } from '@/features/account/api'
import { InterestPicker } from '@/features/account/components/InterestPicker'
import { useRuntimeConfig } from '@/features/config/api'
import { errorMessage, fieldError, isSignedOut } from '@/lib/api/error-message'
import { formatWAT } from '@/lib/time/time'
import { useFormDraft } from '@/stores/drafts'
import type { Me, RuntimeConfig } from '@/types/api'

/** UX-26 / FE-SET-01: grouped settings. Destructive actions confirm first; profile edits survive an expired session. */
export function SettingsPage() {
  const { data: me } = useMe()
  const { data: config } = useRuntimeConfig()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo title="Account settings" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Account settings</h1>
      {!me ? (
        <div aria-busy="true" aria-label="Loading settings" className="h-64 animate-pulse rounded-card bg-cloud" />
      ) : (
        <>
          <ProfileSection me={me} config={config} />
          <PhoneSection me={me} />
          <MessagesSection me={me} />
          <Section title="Privacy and policies">
            <ul className="flex flex-col">
              {[
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms' },
                { to: '/community-rules', label: 'Community rules' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-flex min-h-11 items-center text-body font-medium text-action underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <AccountSection me={me} />
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 id={id} className="text-h3 text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

type ProfileForm = { displayName: string; areaId: string | null; interests: string[] }

const sameForm = (a: ProfileForm, b: ProfileForm) => JSON.stringify(a) === JSON.stringify(b)

function ProfileSection({ me, config }: { me: Me; config?: RuntimeConfig }) {
  const saved: ProfileForm = { displayName: me.displayName ?? '', areaId: me.areaId, interests: me.interests }
  const [form, setForm, clearForm] = useFormDraft<ProfileForm>(`settings:${me.id}`, saved)
  const [attempted, setAttempted] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const update = useUpdateMe()
  const interestsLabel = useId()
  const dirty = !sameForm(form, saved)

  const nameValid = form.displayName.trim().length >= 2 && form.displayName.trim().length <= 40
  const nameError =
    (attempted && !nameValid ? 'Enter a name between 2 and 40 characters.' : null) ??
    fieldError(update.error, 'displayName')

  const change = (changes: Partial<ProfileForm>) => {
    setSavedNotice(false)
    setForm({ ...form, ...changes })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    if (!nameValid) return
    update.mutate(
      { displayName: form.displayName.trim(), areaId: form.areaId, interests: form.interests },
      {
        onSuccess: () => {
          clearForm()
          setAttempted(false)
          setSavedNotice(true)
        },
      },
    )
  }

  return (
    <Section title="Profile">
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        {/* The name has its own field; an expired session gets its own sign-in prompt */}
        {update.error && !fieldError(update.error, 'displayName') && !isSignedOut(update.error) && (
          <Banner tone="danger" title="We couldn't save your profile">
            {errorMessage(update.error)} Your changes are kept.
          </Banner>
        )}
        <TextField
          label="Display name"
          hint="Shown on your listings and offers."
          autoComplete="nickname"
          maxLength={40}
          value={form.displayName}
          onChange={(e) => change({ displayName: e.target.value })}
          error={nameError}
        />
        <CheckList
          label="Your area"
          options={(config?.areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
          value={form.areaId ? [form.areaId] : []}
          onChange={([areaId]) => change({ areaId: areaId ?? null })}
          single
        />
        <div className="flex flex-col gap-2">
          <p id={interestsLabel} className="text-compact font-semibold text-ink">
            Interests <span className="font-normal text-muted">Optional</span>
          </p>
          <InterestPicker
            categories={config?.categories ?? []}
            value={form.interests}
            onChange={(interests) => change({ interests })}
            labelledBy={interestsLabel}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isPending={update.isPending} isDisabled={!dirty}>
            Save changes
          </Button>
          {dirty && (
            <Button variant="tertiary" onPress={clearForm} isDisabled={update.isPending}>
              Discard changes
            </Button>
          )}
          <p role="status" className="text-compact font-medium text-success empty:hidden">
            {savedNotice ? 'Profile saved.' : ''}
          </p>
        </div>
      </form>
    </Section>
  )
}

function PhoneSection({ me }: { me: Me }) {
  return (
    <Section title="Phone number">
      <div className="flex items-center gap-3">
        <Phone aria-hidden className="size-5 text-action" />
        <div className="flex flex-col">
          <p className="tabular text-body font-semibold text-ink">+234 ••• ••• {me.phoneLast4}</p>
          <p className="text-compact text-muted">Phone confirmed. Never shown to other people.</p>
        </div>
      </div>
      <p className="text-compact text-muted">
        Need to change your number?{' '}
        <Link to="/support?topic=account" className="font-semibold text-action underline-offset-4 hover:underline">
          Contact support
        </Link>
        .
      </p>
    </Section>
  )
}

function MessagesSection({ me }: { me: Me }) {
  const update = useUpdateMe()

  return (
    <Section title="Messages from NextOwn">
      <p className="text-compact text-muted">
        Messages about your account, offers and handovers are always sent, so you never miss something you need to act
        on.
      </p>
      <Checkbox
        checked={update.isPending ? (update.variables.marketingOptIn ?? me.marketingOptIn) : me.marketingOptIn}
        onChange={(marketingOptIn) => update.mutate({ marketingOptIn })}
      >
        Text me occasional tips and news from NextOwn
      </Checkbox>
      {update.isError && (
        <p role="alert" className="text-compact text-danger">
          {errorMessage(update.error, 'We couldn’t update this.')}
        </p>
      )}
    </Section>
  )
}

function AccountSection({ me }: { me: Me }) {
  const logout = useLogout()
  const deletion = useDeleteRequest()
  const [confirming, setConfirming] = useState(false)

  return (
    <Section title="Account">
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="self-start"
          isPending={logout.isPending}
          onPress={() => logout.mutate(undefined, { onSuccess: () => toast('You’ve signed out.') })}
        >
          Sign out
        </Button>
        {logout.isError && (
          <p role="alert" className="text-compact text-danger">
            {errorMessage(logout.error, 'We couldn’t sign you out.')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {me.deletionRequestedAt ? (
          <Banner tone="info" title="We’ve received your deletion request">
            Sent {formatWAT(me.deletionRequestedAt, { withTime: false })}
            {deletion.data && <> · Reference {deletion.data.reference}</>}. Our team will text you about your data and
            anything still open, like offers or deals.
          </Banner>
        ) : (
          <>
            <p className="text-compact text-muted">
              Ask us to delete your account and personal data. Our team reviews each request under the Privacy Policy.
            </p>
            <Button variant="danger-soft" className="self-start" onPress={() => setConfirming(true)}>
              Request account deletion
            </Button>
          </>
        )}
        {deletion.isError && (
          <p role="alert" className="text-compact text-danger">
            {errorMessage(deletion.error, 'We couldn’t send your request.')}
          </p>
        )}
      </div>

      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        title="Request account deletion?"
        body="We’ll review your request and text you about your data and anything still open, like offers or deals. Once your account is deleted, it can’t be restored."
        confirmLabel="Send request"
        tone="danger"
        onConfirm={async () => {
          await deletion.mutateAsync()
        }}
      />
    </Section>
  )
}
