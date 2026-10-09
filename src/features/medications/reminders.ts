import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface ScheduleNotificationParams {
  medicationName: string;
  timeLocal: string; // HH:mm
  daysOfWeek: number[]; // 0=Sunday...6=Saturday
  scheduleId: string;
}

/**
 * Request notification permissions if not yet granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to check notification permissions:', error);
    return false;
  }
}

/**
 * Schedules local recurring daily/weekly notifications for a medication reminder.
 * Returns the notification identifier string.
 */
export async function scheduleMedicationNotification(
  params: ScheduleNotificationParams
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const [hourStr, minuteStr] = params.timeLocal.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Medication Reminder',
        body: `Time to take your medication: ${params.medicationName}`,
        data: {
          scheduleId: params.scheduleId,
          timeLocal: params.timeLocal,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return notificationId;
  } catch (error) {
    console.warn('Failed to schedule local notification:', error);
    return null;
  }
}

/**
 * Cancels a scheduled local notification by ID.
 */
export async function cancelMedicationNotification(notificationId: string): Promise<void> {
  if (Platform.OS === 'web' || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Failed to cancel notification:', error);
  }
}
