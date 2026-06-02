let pushPermissionGranted = false;

export async function requestPushPermission(): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions() as any;
    pushPermissionGranted = result?.receive === 'granted' || result?.status === 'granted';
    if (pushPermissionGranted) {
      await PushNotifications.register();
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Received:', notification);
      });
    }
    return pushPermissionGranted;
  } catch (e) {
    console.warn('[Push] Not available:', e);
    return false;
  }
}

export async function scheduleLocalNotification(title: string, body: string, scheduleAt?: Date) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now(),
        schedule: scheduleAt ? { at: scheduleAt } : undefined,
      }],
    });
  } catch (e) {
    console.warn('[LocalNotification] Not available:', e);
  }
}

export async function requestLocalNotificationPermission(): Promise<boolean> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const result = await LocalNotifications.requestPermissions() as any;
    return result?.receive === 'granted' || result?.status === 'granted';
  } catch {
    return false;
  }
}
