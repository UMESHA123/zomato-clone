import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDashboardPayload } from "@/lib/health-check-service";
import { generateEmailHtml } from "@/lib/email-template";

export const runtime = "nodejs";

export async function POST() {
  try {
    const payload = await getDashboardPayload();

    if (!payload.run || payload.run.status !== "completed") {
      return NextResponse.json(
        { error: "No completed health check run available. Please run a health check first." },
        { status: 400 },
      );
    }

    const emailUser = process.env.EMAIL_USER || "uumesharameshahugger@gmail.com";
    const emailPass = process.env.EMAIL_PASSWORD;
    const emailTo = process.env.EMAIL_TO || "uumesharameshahugger@gmail.com";

    let transporter;
    let senderEmail = emailUser;

    if (emailPass) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    } else {
      console.log("No EMAIL_PASSWORD found. Generating a temporary Ethereal test account...");
      const testAccount = await nodemailer.createTestAccount();
      senderEmail = testAccount.user;
      
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const html = generateEmailHtml(payload);

    const totalHealthy = payload.run.healthyCount;
    const totalUnhealthy = payload.run.unhealthyCount;
    const overallRate =
      payload.run.completedChecks > 0
        ? ((totalHealthy / payload.run.completedChecks) * 100).toFixed(1)
        : "0.0";

    const statusEmoji = totalUnhealthy === 0 ? "✅" : "⚠️";
    const subject = `${statusEmoji} Sentinel Health Report — ${overallRate}% Health Rate (${totalHealthy} pass, ${totalUnhealthy} fail)`;

    const info = await transporter.sendMail({
      from: `"Sentinel Monitor" <${senderEmail}>`,
      to: emailTo,
      subject,
      html,
    });

    let previewUrlMessage = "";
    if (!emailPass) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("Email Test Preview URL:", previewUrl);
      previewUrlMessage = ` View the test email safely here: ${previewUrl}`;
    }

    return NextResponse.json({
      success: true,
      message: `Health report sent successfully to ${emailTo}.${previewUrlMessage}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email report";
    console.error("Email send error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
