// @ts-nocheck
// Supabase Edge Function: send-ticket-email
// Runtime: Deno (TypeScript)
// Environment Secret required: RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import QRCode from "npm:qrcode@1.5.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Allowed CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  passId?: string;
  pass_id?: string;
  email?: string;
  playerName?: string;
  captainName?: string;
  captain_name?: string;
  teamName?: string;
  team_name?: string;
  college?: string;
  tournamentSlug?: string;
  tournament_slug?: string;
  tournamentTitle?: string;
  tournament_title?: string;
  tournamentName?: string;
  tournamentDate?: string;
  tournament_date?: string;
  tournamentTime?: string;
  tournament_time?: string;
  tournamentGame?: string;
  tournament_game?: string;
  venue?: string;
  tournamentRegion?: string;
  tournamentFee?: string;
  paymentStatus?: string;
  payment_status?: string;
  orderId?: string;
  order_id?: string;
  paymentId?: string;
  payment_id?: string;
  appUrl?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-ticket-email] RESEND_API_KEY environment secret is missing.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY is not configured in Supabase Edge Function Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: RequestPayload = await req.json().catch(() => ({}));
    const passId = (payload.passId || payload.pass_id || "").trim();

    if (!passId) {
      return new Response(
        JSON.stringify({ success: false, error: "passId is required to generate ticket email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase admin client if credentials exist to fetch/update registration records
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    let supabase: any = null;
    let dbRecord: any = null;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
          .from("registrations")
          .select("*")
          .eq("pass_id", passId)
          .maybeSingle();

        if (!error && data) {
          dbRecord = data;
        }
      } catch (sbErr) {
        console.warn("[send-ticket-email] Supabase query notice:", sbErr);
      }
    }

    // Resolve details (prefer payload or database record)
    const email = (
      payload.email ||
      dbRecord?.email ||
      ""
    ).trim();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Recipient email address could not be resolved." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const playerName =
      payload.playerName ||
      payload.captainName ||
      payload.captain_name ||
      dbRecord?.captain_name ||
      "Player";

    const teamName =
      payload.teamName ||
      payload.team_name ||
      dbRecord?.team_name ||
      "Squad";

    const college =
      payload.college ||
      dbRecord?.college ||
      "Collegiate Esports";

    const tournamentTitle =
      payload.tournamentTitle ||
      payload.tournament_title ||
      payload.tournamentName ||
      dbRecord?.tournament_title ||
      "XENOVA Esports Championship";

    const tournamentSlug =
      payload.tournamentSlug ||
      payload.tournament_slug ||
      dbRecord?.tournament_slug ||
      "";

    const tournamentDate =
      payload.tournamentDate ||
      payload.tournament_date ||
      "Scheduled Soon";

    const tournamentTime =
      payload.tournamentTime ||
      payload.tournament_time ||
      "";

    const tournamentGame =
      payload.tournamentGame ||
      payload.tournament_game ||
      "Esports";

    const venue =
      payload.venue ||
      payload.tournamentRegion ||
      "Xenova Arena & Online Match Lobbies";

    const paymentStatusRaw = (
      payload.paymentStatus ||
      payload.payment_status ||
      dbRecord?.payment_status ||
      "PAID"
    ).toUpperCase();

    const paymentStatus = paymentStatusRaw.includes("FREE") ? "FREE ENTRY" : "PAID";
    const registrationStatus = "CONFIRMED";
    const paymentId = payload.paymentId || payload.payment_id || dbRecord?.payment_id || "";
    const orderId = payload.orderId || payload.order_id || dbRecord?.order_id || "";

    // Base URL for ticket verification link
    const appUrl = (
      payload.appUrl ||
      Deno.env.get("XENOVA_APP_URL") ||
      Deno.env.get("APP_URL") ||
      "https://xenova.gg"
    ).replace(/\/$/, "");

    // Exact verification URL compatible with existing /verify/[passId] route
    const verificationUrl = `${appUrl}/verify/${encodeURIComponent(passId)}`;
    const passWebUrl = tournamentSlug
      ? `${appUrl}/registration/${encodeURIComponent(tournamentSlug)}/pass?passId=${encodeURIComponent(passId)}`
      : `${appUrl}/verify/${encodeURIComponent(passId)}`;

    // Generate Server-Side QR Code PNG Buffer (no external third-party QR API dependencies)
    let qrPngBuffer: Uint8Array | null = null;
    let qrBase64 = "";

    try {
      // Generate scannable high-contrast PNG QR Buffer
      qrPngBuffer = await QRCode.toBuffer(verificationUrl, {
        type: "png",
        width: 280,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      });

      // Convert to base64 string for Resend attachment & inline fallback
      if (qrPngBuffer) {
        let binary = "";
        for (let i = 0; i < qrPngBuffer.length; i++) {
          binary += String.fromCharCode(qrPngBuffer[i]);
        }
        qrBase64 = btoa(binary);
      }
    } catch (qrErr) {
      console.warn("[send-ticket-email] QR code generation notice:", qrErr);
    }

    // Build the responsive, esports-styled HTML email layout
    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XENOVA Tournament Ticket - ${escapeHtml(tournamentTitle)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #09090b;
      padding: 32px 12px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #121217;
      border: 1px solid #27272a;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .header {
      background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 2px solid #10b981;
    }
    .badge {
      display: inline-block;
      background-color: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #34d399;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-size: 13px;
      color: #a1a1aa;
      margin: 0;
    }
    .content {
      padding: 28px 24px;
    }
    .ticket-id-box {
      background-color: #18181b;
      border: 1px dashed #3f3f46;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .ticket-id-label {
      font-size: 10px;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 4px;
    }
    .ticket-id-value {
      font-size: 22px;
      font-weight: 900;
      color: #10b981;
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 2px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .info-row {
      border-bottom: 1px solid #1f1f23;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      padding: 12px 0;
      font-size: 13px;
      color: #a1a1aa;
      font-weight: 600;
      width: 38%;
      vertical-align: top;
    }
    .info-value {
      padding: 12px 0;
      font-size: 14px;
      color: #ffffff;
      font-weight: 700;
      text-align: right;
    }
    .status-pill-paid {
      display: inline-block;
      background-color: #064e3b;
      color: #34d399;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 800;
    }
    .status-pill-confirmed {
      display: inline-block;
      background-color: #1e3a8a;
      color: #60a5fa;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 800;
    }
    .qr-section {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .qr-title {
      font-size: 12px;
      font-weight: 800;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 14px;
    }
    .qr-container {
      display: inline-block;
      padding: 12px;
      background-color: #ffffff;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .qr-caption {
      font-size: 12px;
      color: #71717a;
      line-height: 1.4;
      max-width: 380px;
      margin: 0 auto;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 28px;
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #000000 !important;
      font-size: 14px;
      font-weight: 900;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 8px 16px rgba(16, 185, 129, 0.25);
    }
    .notice-box {
      background-color: rgba(39, 39, 42, 0.5);
      border-left: 3px solid #10b981;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
      font-size: 12px;
      color: #d4d4d8;
      line-height: 1.5;
    }
    .footer {
      background-color: #0e0e11;
      border-top: 1px solid #1f1f23;
      padding: 24px;
      text-align: center;
    }
    .footer-logo {
      font-size: 15px;
      font-weight: 900;
      color: #10b981;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }
    .footer-text {
      font-size: 11px;
      color: #71717a;
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Header -->
      <div class="header">
        <div class="badge">OFFICIAL TOURNAMENT PASS</div>
        <h1 class="title">XENOVA</h1>
        <p class="subtitle">TOURNAMENT TICKET</p>
      </div>

      <!-- Main Content -->
      <div class="content">

        <!-- Ticket Pass ID Banner -->
        <div class="ticket-id-box">
          <div class="ticket-id-label">Unique Ticket ID</div>
          <div class="ticket-id-value">${escapeHtml(passId)}</div>
        </div>

        <!-- Metadata Table -->
        <table class="info-table">
          <tr class="info-row">
            <td class="info-label">🎮 Tournament</td>
            <td class="info-value">${escapeHtml(tournamentTitle)}</td>
          </tr>
          <tr class="info-row">
            <td class="info-label">🎯 Game Title</td>
            <td class="info-value">${escapeHtml(tournamentGame)}</td>
          </tr>
          <tr class="info-row">
            <td class="info-label">👤 Player</td>
            <td class="info-value">${escapeHtml(playerName)}</td>
          </tr>
          <tr class="info-row">
            <td class="info-label">👥 Team</td>
            <td class="info-value">${escapeHtml(teamName)}</td>
          </tr>
          <tr class="info-row">
            <td class="info-label">🏛️ University</td>
            <td class="info-value">${escapeHtml(college)}</td>
          </tr>
          <tr class="info-row">
            <td class="info-label">📅 Date</td>
            <td class="info-value">${escapeHtml(tournamentDate)}</td>
          </tr>
          ${
            tournamentTime
              ? `<tr class="info-row">
                  <td class="info-label">⏰ Time</td>
                  <td class="info-value">${escapeHtml(tournamentTime)}</td>
                </tr>`
              : ""
          }
          <tr class="info-row">
            <td class="info-label">📍 Venue / Region</td>
            <td class="info-value">${escapeHtml(venue)}</td>
          </tr>
          <tr class="info-row">
            <td class="info-label">💳 Payment</td>
            <td class="info-value"><span class="status-pill-paid">${escapeHtml(paymentStatus)}</span></td>
          </tr>
          <tr class="info-row">
            <td class="info-label">✅ Registration</td>
            <td class="info-value"><span class="status-pill-confirmed">${escapeHtml(registrationStatus)}</span></td>
          </tr>
        </table>

        <!-- QR Verification Section -->
        <div class="qr-section">
          <div class="qr-title">Official Check-In QR Code</div>
          <div class="qr-container">
            ${
              qrPngBuffer
                ? `<img src="cid:ticket-qr.png" alt="XENOVA Verification QR" width="160" height="160" style="display:block;border-radius:6px;" />`
                : `<a href="${escapeHtml(verificationUrl)}" style="color:#10b981;font-weight:bold;font-size:13px;">View Digital QR Pass</a>`
            }
          </div>
          <p class="qr-caption">
            Show this QR code or Ticket ID <strong>${escapeHtml(passId)}</strong> at tournament match lobby check-in or the event entrance for verification.
          </p>
        </div>

        <!-- Action Button -->
        <div class="btn-container">
          <a href="${escapeHtml(passWebUrl)}" class="btn-primary" target="_blank">
            View Live Ticket Pass
          </a>
        </div>

        <!-- Important Notice -->
        <div class="notice-box">
          <strong>Player Instructions:</strong> Your registration has been successfully confirmed. Please ensure all team members join the match lobby 15 minutes before scheduled match time.
          ${paymentId ? `<br /><span style="color:#a1a1aa;">Payment Ref: ${escapeHtml(paymentId)}</span>` : ""}
          ${orderId ? `<br /><span style="color:#a1a1aa;">Order Ref: ${escapeHtml(orderId)}</span>` : ""}
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-logo">XENOVA</div>
        <p class="footer-text">University Esports Platform · Ticket Integrity Engine</p>
        <p class="footer-text">This is an automated ticket confirmation. Pass ID: ${escapeHtml(passId)}</p>
        <p class="footer-text" style="margin-top:8px;">© 2026 XENOVA Esports. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>
    `;

    // Construct Resend email payload
    const resendPayload: any = {
      from: "XENOVA <onboarding@resend.dev>",
      to: [email],
      subject: `🎮 XENOVA Tournament Ticket - ${tournamentTitle}`,
      html: htmlEmail,
    };

    // Attach inline QR image if generated
    if (qrBase64) {
      resendPayload.attachments = [
        {
          filename: "ticket-qr.png",
          content: qrBase64,
          content_type: "image/png",
        },
      ];
    }

    console.log(`[send-ticket-email] Sending ticket email for pass ${passId} to ${email}...`);

    // Call Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      const errorMsg = resendData?.message || resendData?.error || `Resend API returned status ${resendResponse.status}`;
      console.warn(`[send-ticket-email] Resend delivery warning for pass ${passId}: ${errorMsg}`);

      // Attempt to update database status to failed (gracefully)
      if (supabase) {
        try {
          await supabase
            .from("registrations")
            .update({
              ticket_email_status: "failed",
              email_error: String(errorMsg).slice(0, 500),
            })
            .eq("pass_id", passId);
        } catch (dbErr) {
          console.warn("[send-ticket-email] DB status update notice:", dbErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          warning: "Email could not be delivered by Resend",
          message: errorMsg,
          passId,
          resendStatus: resendResponse.status,
          resendData,
        }),
        {
          status: 200, // Return 200 so backend caller knows registration succeeded even if Resend returned a testing sender restriction
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[send-ticket-email] Email sent successfully! Resend ID: ${resendData?.id}`);

    // Update database status to 'sent'
    if (supabase) {
      try {
        await supabase
          .from("registrations")
          .update({
            ticket_email_status: "sent",
            email_sent_at: new Date().toISOString(),
            email_error: null,
          })
          .eq("pass_id", passId);
      } catch (dbErr) {
        console.warn("[send-ticket-email] DB status update notice:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tournament ticket email sent successfully.",
        passId,
        emailId: resendData?.id,
        recipient: email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-ticket-email] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "An unexpected error occurred while sending ticket email.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
