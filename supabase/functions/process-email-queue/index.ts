import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1;
const RETRY_DELAY_MINUTES = 15;
const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const { data: jobs, error: fetchError } = await supabase
      .from("email_delivery_queue")
      .select("*")
      .eq("status", "waiting")
      .lte("next_attempt_at", new Date().toISOString())
      .order("created_at", { ascending: true })
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
        console.error("Claim error:", claimError);
        continue;
      }

      if (!claimedJob) {
        continue;
      }

      try {
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
              email_redirect_to: "euno://auth/callback",
            }),
          },
        );

        const responseText = await response.text();

        if (!response.ok) {
          let errorCode: string | null = null;

          try {
            const parsed = JSON.parse(responseText);
            errorCode = parsed.error_code ?? parsed.code ?? null;
          } catch {
            // Response wasn't JSON.
          }

          if (
            response.status === 429 ||
            errorCode === "over_email_send_rate_limit"
          ) {
            throw new Error(
              `RATE_LIMITED: ${responseText}`,
            );
          }

          throw new Error(
            `AUTH_ERROR_${response.status}: ${responseText}`,
          );
        }

        await supabase
          .from("email_delivery_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", job.id);

        processed++;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          `Failed job ${job.id}:`,
          errorMessage,
        );

        const attempts = job.attempts + 1;

        if (attempts >= MAX_ATTEMPTS) {
          await supabase
            .from("email_delivery_queue")
            .update({
              status: "failed",
              last_error: errorMessage,
            })
            .eq("id", job.id);
        } else {
          const nextAttempt = new Date(
            Date.now() +
              RETRY_DELAY_MINUTES * 60 * 1000,
          );

          await supabase
            .from("email_delivery_queue")
            .update({
              status: "waiting",
              next_attempt_at: nextAttempt.toISOString(),
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
    console.error("Worker error:", error);

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
