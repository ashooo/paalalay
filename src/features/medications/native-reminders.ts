import { Platform } from 'react-native';
import { reminderPlan, replaceReminders } from './reminder-plan';
import type { MedicineRow, ScheduleRow } from './occurrences';
import type { NotificationTriggerInput } from 'expo-notifications';

export async function configureNotificationPresentation() {
  if (Platform.OS === 'web') return;
  const N = await import('expo-notifications');
  N.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
}

export async function enableReminders(medicines: MedicineRow[], schedules: ScheduleRow[]) {
  if (Platform.OS === 'web') return 'Phone reminders require the native app. Saved schedules remain available.';
  const N = await import('expo-notifications');
  await configureNotificationPresentation();
  if (Platform.OS === 'android') await N.setNotificationChannelAsync('medication-reminders', { name: 'Reminders', importance: N.AndroidImportance.HIGH });
  const permission = await N.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are not allowed. Enable them in phone settings and refresh reminders.');
  const { plans, limited } = reminderPlan(medicines, schedules, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const count = await replaceReminders({
    list: async () => (await N.getAllScheduledNotificationsAsync()).map(item => item.identifier),
    cancel: id => N.cancelScheduledNotificationAsync(id),
    schedule: plan => N.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: { title: 'PAALALAY', body: 'Time for your reminder', sound: true, data: { scheduleId: plan.scheduleId } },
      trigger: { ...plan.trigger, channelId: 'medication-reminders' } as NotificationTriggerInput,
    }),
  }, plans);
  return `${count} reminder requests enabled.${limited ? ' Date-limited or different-timezone schedules cover up to 28 days ahead. Refresh reminders before that window ends.' : ' Ongoing reminders follow this device’s clock; refresh after changing timezone.'}`;
}

export async function cancelMedicineReminders(scheduleIds: string[]) {
  if (Platform.OS === 'web') return;
  const N = await import('expo-notifications');
  for (const notification of await N.getAllScheduledNotificationsAsync()) {
    if (scheduleIds.some(id => notification.identifier.startsWith(`paalalay:${id}:`))) await N.cancelScheduledNotificationAsync(notification.identifier);
  }
}
