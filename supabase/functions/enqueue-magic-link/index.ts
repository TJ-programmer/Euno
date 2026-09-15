```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const { email, push_token } = await req.json();

    // Validate email
    if (typeof email !== "string") {
      return new Response(
        JSON.stringify({
          error: "Email is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid email",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate optional push token
    if (
      push_token !== undefined &&
      push_token !== null &&
      typeof push_token !== "string"
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid push token",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
     * Check for an existing active queue job.
     */
    const {
      data: existingJob,
      error: existingError,
    } = await supabase
      .from("email_delivery_queue")
      .select(
        "id, email, status, next_attempt_at, created_at, push_token",
      )
      .eq("email", normalizedEmail)
      .in("status", ["waiting", "processing"])
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    /*
     * If the email is already queued, update the push token
     * if the current request provides one.
     */
    if (existingJob) {
      if (
        push_token &&
        existingJob.push_token !== push_token
      ) {
        const { error: updateError } =
          await supabase
            .from("email_delivery_queue")
            .update({
              push_token,
            })
            .eq("id", existingJob.id);

        if (updateError) {
          throw updateError;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          queue_id: existingJob.id,
          status: existingJob.status,
          next_attempt_at:
            existingJob.next_attempt_at,
          already_queued: true,
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

    /*
     * Create a new queue job.
     */
    const {
      data,
      error,
    } = await supabase
      .from("email_delivery_queue")
      .insert({
        email: normalizedEmail,
        status: "waiting",
        push_token: push_token ?? null,
      })
      .select(
        "id, email, status, next_attempt_at, created_at, push_token",
      )
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        queue_id: data.id,
        status: data.status,
        next_attempt_at:
          data.next_attempt_at,
        already_queued: false,
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
      "enqueue-magic-link error:",
      error,
    );

    return new Response(
      JSON.stringify({
        error: "Unable to queue magic link",
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
```
