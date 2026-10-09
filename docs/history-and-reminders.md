# Saved history and medicine management

**Log** shows recent saved readings of all five types, with local display times
and notes. History refreshes after saving, on returning to the screen, or with
Refresh history. Show more loads up to the latest 100 records.

**Medicines** lists active and paused medicines. Manage edits the name, strength
and prescription instructions, including food instructions copied by the user.
Users explicitly choose reminder times, weekdays and optional start/end dates.
Saving a schedule replaces previous times but preserves recorded intake history.
Pause tracking stops queued alerts and retains data; it is not advice to stop
treatment. Resuming requires Refresh phone reminders to re-enable alerts.

Today’s reminders show Upcoming, Not recorded, Taken or Skipped. Not recorded is
derived from the due time and absence of an intake record; it is not automatically
persisted as proof of a missed dose. Users explicitly record Taken or Skipped.
Scheduled time and actual recording time remain distinct. Recording a late or
skipped dose never shifts subsequent reminder times or calculates another dose.

## Native notification behavior

Notification permission is requested only on Save schedule and enable reminders
or Refresh phone reminders. Alerts use a generic title/body without medicine
names, strength, health readings or instructions on the lock screen. Foreground
presentation is configured at startup without database initialization or writes.

Ongoing schedules in the current device timezone use daily/weekly triggers.
Date-limited, future-start or different-timezone schedules use exact date
requests up to 28 days ahead. The screen reports this limit; users must refresh
before that window ends or after timezone changes. A maximum of 60 requests is
allowed. DST gaps are not silently shifted to another time. OS permissions,
battery restrictions and exact-alarm access can still affect delivery.

Replacement cancels old Paalalay notification requests, preserves unrelated
notifications and cleans up new requests if scheduling fails. Permission or OS
failure is reported separately from a saved database schedule. Web can save
schedules through the local API but cannot enable phone reminders. The public
SQL `set_medication_schedule` tool remains separate from the native reminder
adapter; chat still has only its existing medication-list and BP handlers.

## OCR and AI boundary

Native ML Kit OCR extracts text for an editable prescription review and medicine
form. It is not a chat vision tool. It does not automatically save medicines or
generate clinical schedules. The current parser offers hints for one medicine;
multiple medicines require separate reviewed entries. Native OCR delivery still
needs the new build and device/offline verification.

The model must not invent food instructions, doses or catch-up plans. Preserve
explicit prescription/pharmacist instructions. Unclear OCR or missing schedule
times need user clarification. Changes proposed by chat still require review.
Specific missed-dose and food advice should come from the medicine leaflet or a
pharmacist: [NHS missed-dose guidance](https://sps.nhs.uk/articles/advising-on-missed-or-delayed-doses-of-medicines/)
and [food instructions guidance](https://sps.nhs.uk/articles/checking-if-medicines-can-be-given-with-food/).

## Verification

Automated tests cover timezone/day boundaries, taken/skipped history, unchanged
future doses, date bounds, DST gaps, notification limits, permission denial,
generic alert content, replacement cleanup and edits/pauses retaining history.
Database tests and browser saves use only explicitly approved temporary SQLite
files with synthetic records. No existing app database was changed or migrated.

Browser checks verify save-to-health-history, a skipped occurrence, schedule
replacement and retained intake history. Actual Android notification delivery
and native OCR are not proven by browser tests or injected native responses.
