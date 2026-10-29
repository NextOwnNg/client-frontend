import { toast } from '@heroui/react'
import { Avatar } from '@/components/domain/Avatar'
import { useUpdateMe } from '@/features/account/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import { errorMessage } from '@/lib/api/error-message'
import type { MediaRef, Me } from '@/types/api'

/**
 * FE-SET-01 / ruling R7-7: one profile photo, through the same uploader as listings. It's saved as soon as
 * it's uploaded or removed, so there's nothing to forget to save.
 */
export function PhotoSection({ me }: { me: Me }) {
  const update = useUpdateMe()
  const name = me.displayName ?? 'You'
  const current: MediaRef[] = me.avatarUrl
    ? [{ id: 'current', url: me.avatarUrl, alt: `${name}: profile photo`, width: 1, height: 1 }]
    : []

  function change(photos: MediaRef[]) {
    const next = photos.find((p) => p.id !== 'current')
    if (photos.length > 0 && !next) return
    update.mutate(
      { avatarId: next?.id ?? null },
      {
        onSuccess: () => toast(next ? 'Profile photo updated.' : 'Profile photo removed.'),
        onError: (error) => toast.danger(errorMessage(error, 'Your photo wasn’t saved.')),
      },
    )
  }

  return (
    <SettingsSection title="Profile photo">
      <div className="flex items-center gap-4">
        <Avatar name={name} src={me.avatarUrl} size="lg" />
        <p className="text-compact text-muted">
          Shown on your profile, listings, posts and comments. Without one, people see your initials.
        </p>
      </div>
      <PhotoUploader
        value={current}
        onChange={change}
        limits={{ min: 0, max: 1 }}
        itemName={`${name}: profile`}
        error={update.isError ? errorMessage(update.error, 'Your photo wasn’t saved.') : null}
        hint="Use a clear photo of yourself or something that stands for you. Not other people, and not ID documents. To change it, remove this one first."
      />
    </SettingsSection>
  )
}
