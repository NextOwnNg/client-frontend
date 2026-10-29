# NextOwn client: backend handoff

This document is for the backend team. It lists every endpoint the web client calls today, as the mock API answers them. The mock API is MSW, in `src/mocks`. It ends with the questions the client needs answered before the mock can be switched off.

The mock follows the PRD contract (§7, §9). Switching to the real API should only change `VITE_API_BASE_URL`. Where the mock had to guess, the guess is listed under [Open contract questions](#open-contract-questions).

**Sources of truth:**
- Types: `src/types/api.ts`. Every request and response below uses these names.
- Behaviour: `src/mocks/handlers/*.ts` and `src/mocks/db/*.ts`.
- Executable examples: `src/mocks/mock-*.test.ts`, about 130 tests.

## Conventions

- **Session:** an HttpOnly cookie set by `POST /auth/otp/verify`. The client sends `withCredentials` and never reads a token.
- **Money:** integer kobo (`cashKobo`, `askingKobo`). Times are ISO 8601 UTC strings. The client shows them in West Africa Time.
- **Errors:** every failure returns `{ code, message, field_errors?, details?, retry_after_seconds? }`.
  - The client reads errors only through `src/lib/api/error-message.ts`, so new codes degrade to a sensible sentence.
  - `field_errors` keys match request field names. Nested category fields use `categoryFields.<id>`.
- **Retries:** the client does not retry 4xx responses.
- **Idempotency:**
  - These writes send an `Idempotency-Key` header:
    - `POST /offers`;
    - `/offers/:id/{counter,accept,decline,withdraw}`;
    - every `/transactions/:id/*` write.
  - A repeated key must replay the first response, status included.
  - When a response is lost, the client re-reads the resource and never sends a second offer (QA-21).
- **Pagination:** `{ items, nextCursor, total? }`. The cursor is opaque to the client.
- **Not found and private look the same:**
  - Someone else's private resource (an offer, deal, conversation or report target) returns 404, never 403.
  - The client says "couldn't find" for both, so nothing is revealed (QA-16).

### Error codes the client acts on

| Code | Status | What the client does |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 422 | Shows `field_errors` beside the fields, or else the message |
| `AUTH_REQUIRED` | 401 | Opens the session-expired sheet. The draft is kept. |
| `FORBIDDEN` | 403 | Shows "Your account can't do this right now." |
| `ACCOUNT_RESTRICTED` | 403 | Same, and the restricted banner explains why |
| `BLOCKED` | 403 | Shows "You can't message or make offers with this person." It never says who blocked whom. |
| `NOT_FOUND` | 404 | Shows a "couldn't find" state |
| `ITEM_UNAVAILABLE` | 409 | Offer composer: "This item is no longer available. Your offer was not sent." The draft is kept. |
| `OFFER_EXISTS` | 409 | Links to `details.offerId` |
| `STALE_OFFER_VERSION` | 409 | Re-reads the offer and shows the latest version |
| `OFFER_EXPIRED` | 409 | Shows the expired state |
| `INVALID_STATE` | 409 | Re-reads the resource and shows the message |
| `DUPLICATE_ITEM` | 409 | Wizard: links to the existing listing |
| `ALREADY_SHARED`, `ALREADY_REVIEWED`, `REVIEW_NOT_ELIGIBLE` | 409 | Shows the message |
| `APPEAL_EXISTS`, `NOT_RESTRICTED` | 409 | Appeal page: re-reads `/me` and shows the appeal's status |
| `RATE_LIMITED` | 429 | Shows "Wait N minutes", from `retry_after_seconds` or the `Retry-After` header |
| `OTP_INVALID`, `OTP_EXPIRED` | 422 | Shown on the code field |
| `UNSUPPORTED_FORMAT`, `FILE_TOO_LARGE` | 415, 413 | Shown on the photo tile |
| `SERVER_ERROR` | 5xx | Shows "Something went wrong on our side", and reads are retried |

## Endpoints

Paths are relative to the API base. "Member" means a session is required; a request without one gets 401.

### Auth and account

| Method and path | Request | Response |
| :--- | :--- | :--- |
| `POST /auth/otp/request` | `{ phone: "+2348030000001" }` | 202 `{ resendAfterSeconds: 60 }`. 429 with `Retry-After`. The response must not reveal whether the number has an account (FE-AUT-03). |
| `POST /auth/otp/verify` | `{ phone, code }` | 200 `{ user: Me, isNew }` and sets the cookie. 422 `OTP_INVALID` or `OTP_EXPIRED`, and 429 when locked. |
| `POST /auth/logout` | none | 204 |
| `GET /me` | none | `Me`, including `appeal?`, `avatarUrl?` and `restricted`. A guest gets 401, which the client treats as "guest". |
| `PATCH /me` | `MeUpdate`: `displayName`, `areaId`, `interests`, `marketingOptIn`, `acceptTerms { version, adult }` and `avatarId: string \| null` | `Me` |
| `POST /me/delete-request` | none | 202 `{ reference, requestedAt }`. Repeating it returns the same request. |
| `POST /me/appeal` | `{ message }` (20 to 2000 characters) | 201 `Appeal { caseRef, status, createdAt }`. 409 `NOT_RESTRICTED`, or `APPEAL_EXISTS` with `details.appeal`. |
| `GET /config` | none | `RuntimeConfig`: city, areas, categories with their fields, offer lifetime, Quick Sell options, reservation days and photo limits |

### Listings and discovery

| Method and path | Request | Response |
| :--- | :--- | :--- |
| `GET /listings` | Query: `q`, `category`, `area`, `mode` (a list: `CASH`, `SWAP`, `QUICK_SELL`), `condition` (a list), `price_min` and `price_max` in naira, `sort=recent`, `cursor` | `Paginated<ListingSummary>`. Active listings only. |
| `GET /listings/suggest?q=` | none | Up to 6 `ListingSuggestion` |
| `GET /listings/:slugOrId` | none | `ListingDetail`. A removed listing is stripped to generic fields. For a member, it includes `viewer: { blockedSeller }`. |
| `GET /users/:id` | none | `PublicProfile`, with no phone number and no exact location |
| `GET /users/:id/listings` | none | `Paginated<ListingSummary>`, active listings only |
| `GET /me/listings`, `GET /me/listings/:id` | none | `OwnListing[]` and `OwnListing`, in every status |
| `POST /listings` | `Partial<ListingInput>` | 201 `OwnListing` (a draft) |
| `PATCH /listings/:id` | `Partial<ListingInput>` | `OwnListing`. Published listings are validated as a whole. |
| `DELETE /listings/:id` | none | 204, for drafts only |
| `POST /listings/:id/publish` | none | `OwnListing` with status `ACTIVE` or `PENDING_REVIEW`. 422 with `field_errors`, or 409 `DUPLICATE_ITEM`. |
| `POST /listings/:id/close` | none | `OwnListing` |
| `POST /listings/:id/renew` | `{ quickSellHours: number \| null }` | `OwnListing`, for expired listings only |
| `POST /media` | multipart `file` (JPG, PNG or WebP, up to 10 MB) | 201 `MediaRef { id, url, alt, width, height }` |

### Offers and deals

| Method and path | Request | Response |
| :--- | :--- | :--- |
| `GET /offers`, `GET /offers/:id` | none | `Offer[]` and `Offer`, from the viewer's side (`viewerRole`, `turnUserId`) |
| `POST /offers` (idempotent) | `NewOffer { listingId, mode, offeredItemId, cashKobo, cashDirection, note }` | 201 `Offer`. 409 `ITEM_UNAVAILABLE` or `OFFER_EXISTS`, and 403 `BLOCKED`. |
| `POST /offers/:id/counter` (idempotent) | `OfferTerms` and `expectedVersionId` | `Offer`. 409 `STALE_OFFER_VERSION`. |
| `POST /offers/:id/accept` (idempotent) | `{ expectedVersionId }` | `Offer` with `transactionId`. Both items are reserved in the same database transaction. |
| `POST /offers/:id/decline`, `/withdraw` (idempotent) | none | `Offer` |
| `GET /me/items`, `POST /me/items` | `OfferItemInput` | `SwapItem[]` and 201 `SwapItem`. These are offer-only items: only the offer's recipient sees them. |
| `GET /transactions`, `GET /transactions/:id` | none | `Transaction[]` and `Transaction` (the agreement is frozen at acceptance) |
| `PUT /transactions/:id/meeting` | `{ place, time, note }` | `Transaction`. Private to the two people. |
| `POST /transactions/:id/meeting/agree` | none | `Transaction` |
| `POST /transactions/:id/confirm` | `{ checks: ConfirmCheck[] }` | `Transaction`. Completes when both people confirm. |
| `POST`, `DELETE /transactions/:id/cancellation`; `POST .../accept`, `.../decline` | `{ reason, note? }` | `Transaction` |
| `POST /transactions/:id/dispute` | `{ category, description, evidence: MediaRef[] }` | `Transaction` with `dispute.caseRef`. It also appears in `GET /me/reports`. |
| `POST /transactions/:id/review` | `{ rating: 1..5, note? }` | `Transaction`. Only after `COMPLETED`. |
| `GET /me/reviews` | none | `{ received, given }` as `ReviewWithContext[]` |

### Community

| Method and path | Request | Response |
| :--- | :--- | :--- |
| `GET /feed?cursor` | none | `Paginated<FeedPost>`. Each post's listing is joined live. Posts by people the viewer blocked are left out. |
| `GET /feed/:id`, `POST /feed` | `{ listingId, caption }` | `FeedPost`. 409 `ALREADY_SHARED`. |
| `GET /feed/:id/comments`, `POST /feed/:id/comments` | `{ body }` | `FeedComment[]` newest first, and 201 `FeedComment`. A removed comment has an empty body. Returns 429 `RATE_LIMITED`. |
| `GET /saved/ids`; `GET /saved/listings`, `/saved/posts`; `PUT`, `DELETE /saved/:kind/:id` | none | `SavedIds`, `ListingSummary[]` and `FeedPost[]`. Saving is idempotent. |
| `GET /conversations`, `POST /conversations` | `{ offerId }` or `{ transactionId }` | `Conversation[]`, and `{ id }`, which finds or creates the conversation |
| `GET /conversations/:id` | none | `ConversationDetail` with `blocked: none \| by-me \| by-them`, and offer cards built from the offer's versions |
| `POST /conversations/:id/messages` | `{ clientId, body }` | 201 `ChatMessage`. A repeated `clientId` is stored once. 403 `BLOCKED`. |
| `POST /conversations/:id/read` | none | 204 |
| `GET /notifications`, `GET /notifications/counts` | none | `AppNotification[]` and `{ notifications, messages }`. The client polls every 30 s. |
| `POST /notifications/:id/read`, `POST /notifications/read-all` | none | 204 |

### Trust and safety

| Method and path | Request | Response |
| :--- | :--- | :--- |
| `GET /reports/target/:type/:id` | `type`: `listing`, `post`, `comment`, `conversation`, `offer` or `user` | `ReportTarget { type, id, label, author }`. Returns 404 for removed or private targets. |
| `POST /reports` | `NewReport { targetType, targetId, reason, description, evidenceIds, alsoBlock? }` | 201 `{ report: CaseReport, duplicate: false }`, or 200 with `duplicate: true` and the open case. 422 when the reporter owns the target, or when `OTHER` comes with fewer than 10 characters. |
| `GET /me/reports` | none | `CaseReport[]`, newest first. Status only, never moderator notes (FE-TRU-03). Includes deal disputes. |
| `GET /me/blocks` | none | `BlockedPerson[]` |
| `PUT /me/blocks/:userId`, `DELETE /me/blocks/:userId` | none | 204. Idempotent. Blocking yourself returns 422. |

**What a block must enforce on the server (QA-18):**
- No new messages, offers, counters or accepts between the two people, in either direction.
- The blocker no longer sees the other person's posts and comments.
- Existing offers, deals and messages stay readable for both people.

## Open contract questions

1. **Publishing:** is publishing its own call (`POST /listings/:id/publish`, as mocked), or is it `PATCH` with `status`? Which moderation rules send a listing to `PENDING_REVIEW` instead of `ACTIVE`?
2. **Signed uploads:** the client posts multipart to `/media`. If uploads go straight to object storage, the client needs a `POST /media/upload-url` → `{ uploadUrl, mediaId, headers }` step, plus a confirm call. Do uploads use an `Idempotency-Key`?
3. **Image variants and Save-Data (PRD §8):** the client shows one URL per photo. For smaller variants it needs either a `srcset` list per image or a sizing parameter on the CDN URL. With that in place, the client will send small variants when `navigator.connection.saveData` is on. It already skips hover prefetching then.
4. **Session cookie:** the cookie's name, `SameSite`, its domain (API and app on sibling subdomains?), its lifetime, and whether the session renews on activity. The client handles a 401 at any point by showing a sign-in sheet that keeps the draft.
5. **CSRF:** with cookie auth, does the API want a CSRF header or double-submit token on writes?
6. **Report queue:**
   - Confirm the statuses `RECEIVED`, `IN_REVIEW`, `ACTION_TAKEN` and `CLOSED`, and that they're the only ones a reporter sees.
   - Should a reporter be notified when the status changes? A `REPORT_UPDATED` notification kind would slot into the existing inbox.
7. **Case references:** reports, disputes and appeals share one `NX-######` sequence in the mock. Is that right?
8. **Appeals:** a decided appeal currently allows a new one. Is there a cool-down? Where is the decision shown? The appeal page shows it today, and a notification is proposed.
9. **Blocks and existing deals:** if a block happens during an open deal, may the deal still complete? The mock keeps deal actions working and stops only messages and new offers. Confirm this.
10. **Notification preferences (FE-NTF-02, P1):** not built. Essential alerts can't be turned off, and only marketing texts can be (`marketingOptIn`). Is a per-kind preferences endpoint wanted for the pilot?
11. **Profile photos:** `PATCH /me { avatarId }` takes an uploaded media id. Should profile photos be moderated before they show?
12. **Evidence shape:** reports send `evidenceIds: string[]`, and disputes send `evidence: MediaRef[]`. Which one should the API take? The client will align both to it.
13. **Runtime config:** the PRD lists support contacts in `/config`, and the mock has none. The safety pages point people to in-app reports until contacts exist.

## Accessibility checklist for VoiceOver and TalkBack

These still need someone to run them on real devices. The automated parts already pass: axe (0 violations on 27 routes at 390 px) and the keyboard tests in the suite.

- **Sign in:** the OTP field reads as one field, "Confirm phone" submits, and nothing submits on its own.
- **Explore:** filters open in a sheet that traps focus and returns it on close, and the results count is announced.
- **Listing:** the gallery is operable with swipe and with the next and previous buttons, and the photo position is read ("Photo 2 of 3"). Defects are read before Make an offer.
- **Offer composer:** each step's heading is announced, the error summary links to each field, and the "who pays whom" sentence is read in full.
- **Deal:** each confirmation checkbox reads its whole statement, and the dispute sheet's danger notice is read first.
- **Messages:** new messages from the other person are announced politely, and a blocked thread reads its notice instead of a composer.
- **Report, Block and Appeal:** the reason radio cards read their title and description, the block confirmation states its effect, and the case reference is announced on success.
- **Status badges:** every status is read as text, never as colour alone.
