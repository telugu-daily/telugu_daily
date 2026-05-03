import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_SCHEDULED_KEY = 'dailyNotifScheduled';
const NOTIF_HOUR = 7;   // 7 AM
const NOTIF_MINUTE = 0;

// How the notification appears when the app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('[notifications] setNotificationHandler failed:', e);
}

const STREAK_MESSAGES = [
  { title: (name: string) => `Hey ${name} 🔥 Your streak is on the line!`, body: 'Just 5 minutes of Telugu today keeps it alive.' },
  { title: (name: string) => `Hey ${name} ⚡ Day not done yet!`, body: 'Your Telugu lesson is ready. Don\'t miss today.' },
  { title: (name: string) => `Hey ${name} 🏆 Champions show up every day`, body: 'Open Telugu Daily and keep your winning streak.' },
  { title: (name: string) => `Hey ${name} 📖 One lesson. That\'s all.`, body: 'Spend 5 minutes on Telugu and feel great about it.' },
  { title: (name: string) => `Hey ${name} 🎯 Stay on track today`, body: 'You\'ve been consistent. Don\'t stop now!' },
  { title: (name: string) => `Hey ${name} 💪 Small steps, big results`, body: 'Your daily Telugu practice adds up. Open the app.' },
  { title: (name: string) => `Hey ${name} 🌅 Make today count`, body: 'A quick Telugu session is all it takes to keep your streak.' },
  { title: (name: string) => `Hey ${name} 🚀 You\'re on a roll!`, body: 'Keep the momentum going — your lesson is waiting.' },
];

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4ECDC4',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleDailyNotification(userName = 'there'): Promise<void> {
  try {
    const granted = await requestPermissions();
    if (!granted) return;

    // Cancel any previously scheduled daily reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'daily-reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Pick a random message
    const msg = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)];
    const firstName = userName;

    // Schedule repeating daily at NOTIF_HOUR:NOTIF_MINUTE
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title(firstName),
        body: msg.body,
        sound: false,
        data: { type: 'daily-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: NOTIF_HOUR,
        minute: NOTIF_MINUTE,
      },
    });

    await AsyncStorage.setItem(NOTIF_SCHEDULED_KEY, 'true');
    console.log(`[notifications] Daily reminder scheduled at ${NOTIF_HOUR}:${String(NOTIF_MINUTE).padStart(2, '0')} AM`);
  } catch (e) {
    console.log('[notifications] Failed to schedule:', e);
  }
}

export function useNotifications(isAuthenticated: boolean, userName?: string) {
  const notifListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Schedule notification if not already scheduled for this user name
    AsyncStorage.getItem(NOTIF_SCHEDULED_KEY).then((val) => {
      // Reschedule if: never scheduled, or username changed (key stores last scheduled name)
      if (!val || val !== (userName || 'there')) {
        scheduleDailyNotification(userName).then(() => {
          // Store the name we scheduled for so we reschedule if it changes
          AsyncStorage.setItem(NOTIF_SCHEDULED_KEY, userName || 'there').catch(() => {});
        });
      }
    });

    // Listen for notifications received while app is open
    notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[notifications] Received:', notification.request.content.title);
    });

    // Listen for user tapping the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[notifications] Tapped:', response.notification.request.content.title);
      // App will open automatically — no extra navigation needed for now
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);
}

// Call this when user completes a day — reschedules with fresh message for tomorrow
export async function rescheduleAfterCompletion(userName?: string): Promise<void> {
  await AsyncStorage.removeItem(NOTIF_SCHEDULED_KEY);
  await scheduleDailyNotification(userName);
  await AsyncStorage.setItem(NOTIF_SCHEDULED_KEY, userName || 'there').catch(() => {});
}
