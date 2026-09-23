
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1;
const RETRY_DELAY_MINUTES = 60;
const MAX_ATTEMPTS = 5;

const EUNO_PUSH_TITLE = "Your Euno magic link is ready.";
const EUNO_PUSH_BODY =
  "Your magic link has been sent. Tap to continue with Euno.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing Supabase environment variables",
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    /*
     * Get the oldest queue job that is ready.
     */
    const { data: jobs, error: fetchError } =
      await supabase
        .from("email_delivery_queue")
        .select("*")
        .eq("status", "waiting")
        .lte(
          "next_attempt_at",
          new Date().toISOString(),
        )
        .order("created_at", {
          ascending: true,
        })
        .limit(BATCH_SIZE);

    if (fetchError) {
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No jobs ready",
          processed: 0,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    let processed = 0;

    for (const job of jobs) {
      /*
       * Claim the job.
       *
       * The status condition prevents two workers from
       * processing the same waiting job simultaneously.
       */
      const { data: claimedJob, error: claimError } =
        await supabase
          .from("email_delivery_queue")
          .update({
            status: "processing",
            attempts: job.attempts + 1,
          })
          .eq("id", job.id)
          .eq("status", "waiting")
          .select()
          .maybeSingle();

      if (claimError) {
        console.error(
          "Claim error:",
          claimError,
        );
        continue;
      }

      if (!claimedJob) {
        continue;
      }

      const currentAttempt = job.attempts + 1;

      try {
        /*
         * Send the magic link through Supabase Auth.
         */
        const response = await fetch(
          `${supabaseUrl}/auth/v1/otp`,
          {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: job.email,
              create_user: true,
              email_redirect_to:
                "euno://auth/callback",
            }),
          },
        );

        const responseText =
          await response.text();

        if (!response.ok) {
          let errorCode: string | null = null;

          try {
            const parsed =
              JSON.parse(responseText);

            errorCode =
              parsed.error_code ??
              parsed.code ??
              null;
          } catch {
            // Response wasn't JSON.
          }

          if (
            response.status === 429 ||
            errorCode ===
              "over_email_send_rate_limit"
          ) {
            throw new Error(
              `RATE_LIMITED: ${responseText}`,
            );
          }

          throw new Error(
            `AUTH_ERROR_${response.status}: ${responseText}`,
          );
        }

        /*
         * The email was successfully accepted by
         * Supabase Auth.
         *
         * Mark the queue job as sent BEFORE attempting
         * push delivery. Email delivery is the primary
         * operation; push is only a notification about it.
         */
        const { error: sentUpdateError } =
          await supabase
            .from("email_delivery_queue")
            .update({
              status: "sent",
              sent_at:
                new Date().toISOString(),
              last_error: null,
            })
            .eq("id", job.id);

        if (sentUpdateError) {
          throw sentUpdateError;
        }

        processed++;

        /*
         * Push notification is optional.
         *
         * If there is no push token, the email has
         * still succeeded and the queue job remains sent.
         */
        if (job.push_token) {
          try {
            const pushResponse = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  to: job.push_token,
                  sound: "default",
                  title: EUNO_PUSH_TITLE,
                  body: EUNO_PUSH_BODY,
                  data: {
                    type: "magic_link_ready",
                    email: job.email,
                  },
                }),
              },
            );

            const pushText =
              await pushResponse.text();

            if (!pushResponse.ok) {
              console.error(
                `Push failed for job ${job.id}:`,
                pushText,
              );
            } else {
              console.log(
                `Push sent for job ${job.id}:`,
                pushText,
              );
            }
          } catch (pushError) {
            /*
             * Never turn a successful email into a
             * failed queue job because push delivery
             * failed.
             */
            console.error(
              `Push notification error for job ${job.id}:`,
              pushError,
            );
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          `Failed job ${job.id}:`,
          errorMessage,
        );

        if (currentAttempt >= MAX_ATTEMPTS) {
          await supabase
            .from("email_delivery_queue")
            .update({
              status: "failed",
              last_error: errorMessage,
            })
            .eq("id", job.id);
        } else {
          /*
           * Rate limits get a longer retry window.
           * This avoids repeatedly hitting the
           * provider's email quota.
           */
          const nextAttempt =
            new Date(
              Date.now() +
                RETRY_DELAY_MINUTES *
                  60 *
                  1000,
            );

          await supabase
            .from("email_delivery_queue")
            .update({
              status: "waiting",
              next_attempt_at:
                nextAttempt.toISOString(),
              last_error: errorMessage,
            })
            .eq("id", job.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "Worker error:",
      error,
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: "Worker failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
