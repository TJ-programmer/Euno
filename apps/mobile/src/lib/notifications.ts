
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    throw new Error("Missing EAS project ID");
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  console.log("Expo push token:", token);

  return token;
}

