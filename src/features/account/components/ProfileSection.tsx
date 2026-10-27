import { Button } from '@heroui/react'
import { useId, useState, type FormEvent } from 'react'
import { Banner } from '@/components/ui/Banner'
import { CheckList } from '@/components/ui/ChoiceList'
import { TextField } from '@/components/ui/TextField'
import { useUpdateMe } from '@/features/account/api'
import { InterestPicker } from '@/features/account/components/InterestPicker'
import { errorMessage, fieldError, isSignedOut } from '@/lib/api/error-message'
import { useFormDraft } from '@/stores/drafts'
import type { Me, RuntimeConfig } from '@/types/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'

type ProfileForm = { displayName: string; areaId: string | null; interests: string[] }

const sameForm = (a: ProfileForm, b: ProfileForm) => JSON.stringify(a) === JSON.stringify(b)

export function ProfileSection({ me, config }: { me: Me; config?: RuntimeConfig }) {
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
    <SettingsSection title="Profile">
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
    </SettingsSection>
  )
}
