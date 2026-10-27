import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { useEffect, useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Banner } from '@/components/ui/Banner'
import { CheckList } from '@/components/ui/ChoiceList'
import { TextField } from '@/components/ui/TextField'
import { useUpdateMe } from '@/features/account/api'
import { InterestPicker } from '@/features/account/components/InterestPicker'
import { SettingsSection } from '@/features/account/components/SettingsSection'
import { displayNameSchema } from '@/features/account/profile-schema'
import { errorMessage, fieldError, isSignedOut } from '@/lib/api/error-message'
import { useFormDraft } from '@/stores/drafts'
import type { Me, RuntimeConfig } from '@/types/api'

const profileSchema = z.object({
  displayName: displayNameSchema,
  areaId: z.string().nullable(),
  interests: z.array(z.string()),
})

type ProfileForm = z.infer<typeof profileSchema>

const sameForm = (a: ProfileForm, b: ProfileForm) => JSON.stringify(a) === JSON.stringify(b)

/** Name, area and interests. Unsaved edits are a draft, so leaving the page loses nothing. */
export function ProfileSection({ me, config }: { me: Me; config?: RuntimeConfig }) {
  const saved: ProfileForm = { displayName: me.displayName ?? '', areaId: me.areaId, interests: me.interests }
  const [draft, saveDraft, clearDraft] = useFormDraft<ProfileForm>(`settings:${me.id}`, saved)
  const { control, handleSubmit, reset, setError, watch } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: draft,
  })
  const [savedNotice, setSavedNotice] = useState(false)
  const update = useUpdateMe()
  const interestsLabel = useId()
  const dirty = !sameForm(watch(), saved)

  useEffect(() => {
    const subscription = watch((values) => {
      setSavedNotice(false)
      saveDraft(values as ProfileForm)
    })
    return () => subscription.unsubscribe()
  }, [watch, saveDraft])

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values)
      reset(values)
      clearDraft()
      setSavedNotice(true)
    } catch (error) {
      const message = fieldError(error, 'displayName')
      if (message) setError('displayName', { message })
    }
  })

  function discard() {
    reset(saved)
    clearDraft()
  }

  return (
    <SettingsSection title="Profile">
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
        {/* The name has its own field; an expired session gets its own sign-in prompt */}
        {update.error && !fieldError(update.error, 'displayName') && !isSignedOut(update.error) && (
          <Banner tone="danger" title="We couldn't save your profile">
            {errorMessage(update.error)} Your changes are kept.
          </Banner>
        )}
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <TextField
              label="Display name"
              hint="Shown on your listings and offers."
              autoComplete="nickname"
              maxLength={40}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="areaId"
          render={({ field }) => (
            <CheckList
              label="Your area"
              options={(config?.areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
              value={field.value ? [field.value] : []}
              onChange={([areaId]) => field.onChange(areaId ?? null)}
              single
            />
          )}
        />
        <div className="flex flex-col gap-2">
          <p id={interestsLabel} className="text-compact font-semibold text-ink">
            Interests <span className="font-normal text-muted">Optional</span>
          </p>
          <Controller
            control={control}
            name="interests"
            render={({ field }) => (
              <InterestPicker
                categories={config?.categories ?? []}
                value={field.value}
                onChange={field.onChange}
                labelledBy={interestsLabel}
              />
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isPending={update.isPending} isDisabled={!dirty}>
            Save changes
          </Button>
          {dirty && (
            <Button variant="tertiary" onPress={discard} isDisabled={update.isPending}>
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
