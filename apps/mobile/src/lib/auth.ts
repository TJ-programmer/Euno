
import { supabase } from "@/lib/supabase";
import { getExpoPushToken } from "@/lib/notifications";

type MagicLinkResult =
  | { status: "sent" }
  | { status: "queued"; queueId: string };

export async function sendMagicLink(
  email: string,
): Promise<MagicLinkResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: "euno://auth/callback",
    },
  });

  if (!error) {
    return {
      status: "sent",
    };
  }

  if (error.code === "over_email_send_rate_limit") {
    /*
     * The direct email attempt was rate limited.
     *
     * Only now ask for notification permission.
     * The notification is specifically useful because
     * the magic link is going into the queue.
     */
    let pushToken: string | null = null;

    try {
      pushToken = await getExpoPushToken();
    } catch (pushError) {
      console.error(
        "Unable to get push token:",
        pushError,
      );
    }

    const { data, error: queueError } =
      await supabase.functions.invoke(
        "enqueue-magic-link",
        {
          body: {
            email: normalizedEmail,
            push_token: pushToken,
          },
        },
      );

    if (queueError) {
      throw queueError;
    }

    if (!data?.success || !data?.queue_id) {
      throw new Error("Failed to queue magic link");
    }

    return {
      status: "queued",
      queueId: data.queue_id,
    };
  }

  throw error;
}

