import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Create the notification channel once at startup — not on every call
let _channelCreated = false;
async function ensureChannel() {
  if (_channelCreated) return;
  try {
    await LocalNotifications.createChannel({
      id: 'hydration_reminders',
      name: 'Hydration & Water Reminders',
      description: 'Timely reminders to drink water and track macros',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    _channelCreated = true;
  } catch (err) {}
}

/**
 * Request notification permissions on Android (native prompt) and Web
 */
export async function requestNotificationPermission() {
  try {
    if (Capacitor.isNativePlatform()) {
      // Ensure channel exists as early as possible
      await ensureChannel();
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return true;
      }
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
  } catch (e) {
    console.warn('Failed to request notification permission:', e);
  }
  return false;
}

/**
 * Trigger an immediate notification (native Android banner or web notification)
 */
export async function showNotification(title, body) {
  try {
    if (Capacitor.isNativePlatform()) {
      // Channel is already created at startup — fire immediately
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 90000) + 1000,
            channelId: 'hydration_reminders',
            schedule: { at: new Date(Date.now() + 50) }, // 50ms — as close to instant as Android allows
          },
        ],
      });
      return;
    }
  } catch (e) {
    console.warn('Native notification dispatch note:', e);
  }

  // Web fallback
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn('Web notification note:', e);
  }
}

/**
 * Schedule recurring hydration reminders across the day on Android
 */
export async function scheduleHydrationReminders(enabled, intervalMins = 90, start = '08:00', end = '21:00') {
  try {
    if (Capacitor.isNativePlatform()) {
      // Clear previously scheduled notifications
      try {
        const pending = await LocalNotifications.getPending();
        if (pending && pending.notifications && pending.notifications.length > 0) {
          await LocalNotifications.cancel(pending);
        }
      } catch (cErr) {}

      if (!enabled) return;

      const [startH, startM] = (start || '08:00').split(':').map(Number);
      const [endH, endM] = (end || '21:00').split(':').map(Number);
      const interval = Math.max(15, Number(intervalMins) || 90);

      // Rotating hydration messages — each scheduled slot gets a different one
      const WATER_MSGS = [
        { title: '💧 Drink water bro!',       body: "You haven't sipped in a while. 250ml right now — muscles stay full, metabolism stays lit. 🔥" },
        { title: '🚰 Hydration check!',        body: 'Your body is ~60% water and it\'s drying up. Grab a glass and top it off. Don\'t skip this!' },
        { title: '💧 Water time!',             body: 'Even mild dehydration tanks your focus and energy. One glass now, thank yourself later. 💪' },
        { title: '🥤 Sip sip go!',            body: 'Protein hits harder when you\'re hydrated. Drink 250ml — keep those macros working for you.' },
        { title: '💧 Stay hydrated king!',     body: 'Water = better digestion, clearer skin, more energy. One glass. Do it now, don\'t wait.' },
        { title: '🌊 Hydration o\'clock!',     body: 'Fat metabolism slows when you\'re dry. Drink up and keep your body running at 100%.' },
      ];

      const notifications = [];
      let currentMin = startH * 60 + (startM || 0);
      const endTotal = endH * 60 + (endM || 0);
      let idCounter = 2000;
      let msgIdx = 0;

      while (currentMin <= endTotal && notifications.length < 30) {
        const targetH = Math.floor(currentMin / 60);
        const targetM = currentMin % 60;

        const scheduledDate = new Date();
        scheduledDate.setHours(targetH, targetM, 0, 0);

        // If today's time has already passed, schedule for tomorrow
        if (scheduledDate.getTime() < Date.now()) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const msg = WATER_MSGS[msgIdx % WATER_MSGS.length];
        msgIdx++;

        notifications.push({
          title: msg.title,
          body: msg.body,
          id: idCounter++,
          channelId: 'hydration_reminders',
          schedule: {
            at: scheduledDate,
            repeats: true,
            every: 'day',
          },
        });

        currentMin += interval;
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    }
  } catch (e) {
    console.warn('Failed to schedule hydration reminders:', e);
  }
}
