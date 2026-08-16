import os
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

class EmailService:
    def _get_config(self):
        """Read SMTP config at call time so .env loaded by main.py is picked up."""
        return {
            "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "port": int(os.getenv("SMTP_PORT", "587")),
            "username": os.getenv("SMTP_USERNAME", ""),
            "password": os.getenv("SMTP_PASSWORD", ""),
            "from_addr": os.getenv("SMTP_FROM", os.getenv("SMTP_USERNAME", "no-reply@phishguard.ai")),
            "app_url": os.getenv("APP_URL", "http://localhost:5173"),
        }

    @property
    def enabled(self):
        cfg = self._get_config()
        return bool(cfg["host"] and cfg["username"] and cfg["password"])

    def _send_email_raw(self, to_email: str, subject: str, body_html: str, body_text: str) -> bool:
        cfg = self._get_config()

        if not self.enabled:
            print(f"[EmailService Audit] SMTP not configured. Would send to '{to_email}': {subject}")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = cfg["from_addr"]
            msg["To"] = to_email

            msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(cfg["username"], cfg["password"])
                server.sendmail(cfg["from_addr"], to_email, msg.as_string())

            print(f"[EmailService ✓] Sent email to '{to_email}': {subject}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            print(f"[EmailService ✗] Gmail Auth Failed for '{cfg['username']}': {e}")
            print("[EmailService] >>> If using Gmail, you MUST use an App Password.")
            print("[EmailService] >>> Go to: https://myaccount.google.com/apppasswords")
            return False
        except Exception as e:
            print(f"[EmailService ✗] Failed to send email to '{to_email}': {e}")
            return False

    def send_verification_email(self, to_email: str, name: str, token: str):
        cfg = self._get_config()
        app_url = cfg["app_url"]
        verify_url = f"{app_url}/verify-email?token={token}"
        subject = "🕷 PhishGuard AI — Verify Your Email Address"

        html = f"""
        <div style="font-family:Arial,sans-serif;background:#0b0f19;color:#fff;padding:32px;border-radius:10px;max-width:560px;margin:auto;border:1px solid rgba(239,68,68,0.3)">
          <div style="text-align:center;margin-bottom:24px">
            <div style="font-size:28px;font-weight:900;letter-spacing:2px">🕷 PHISHGUARD <span style="color:#ef4444">AI</span></div>
            <div style="font-size:12px;color:#94a3b8;letter-spacing:1px;margin-top:4px">CYBER THREAT PROTECTION PLATFORM</div>
          </div>
          <h2 style="color:#ef4444;font-size:18px;margin-bottom:12px">EMAIL VERIFICATION REQUIRED</h2>
          <p>Hello <strong>{name}</strong>,</p>
          <p>Thank you for registering with <strong>PhishGuard AI</strong>. Please verify your email address to activate real-time threat protection on your account.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="{verify_url}" style="background:linear-gradient(135deg,#dc2626,#9f1239);color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1px">
              ✓ VERIFY EMAIL ADDRESS
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8">Link expires in <strong>30 minutes</strong>. If you did not create this account, please ignore this email.</p>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#475569">
            PhishGuard AI · Real-Time Phishing Detection Platform
          </div>
        </div>
        """
        text = f"Hello {name},\n\nVerify your PhishGuard AI account:\n{verify_url}\n\nLink expires in 30 minutes."
        return self._send_email_raw(to_email, subject, html, text)

    def send_password_reset_email(self, to_email: str, name: str, token: str):
        cfg = self._get_config()
        app_url = cfg["app_url"]
        reset_url = f"{app_url}/reset-password?token={token}"
        subject = "🕷 PhishGuard AI — Password Reset Request"

        html = f"""
        <div style="font-family:Arial,sans-serif;background:#0b0f19;color:#fff;padding:32px;border-radius:10px;max-width:560px;margin:auto;border:1px solid rgba(59,130,246,0.3)">
          <div style="text-align:center;margin-bottom:24px">
            <div style="font-size:28px;font-weight:900;letter-spacing:2px">🕷 PHISHGUARD <span style="color:#ef4444">AI</span></div>
          </div>
          <h2 style="color:#3b82f6;font-size:18px">PASSWORD RESET REQUEST</h2>
          <p>Hello <strong>{name}</strong>,</p>
          <p>We received a request to reset your PhishGuard AI account password.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="{reset_url}" style="background:linear-gradient(135deg,#1d4ed8,#1e3a8a);color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1px">
              🔑 RESET MY PASSWORD
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8">Link expires in <strong>30 minutes</strong>. If you didn't request this, no action is needed.</p>
        </div>
        """
        text = f"Hello {name},\n\nReset your password:\n{reset_url}\n\nExpires in 30 minutes."
        return self._send_email_raw(to_email, subject, html, text)

    def send_threat_alert_email(self, to_email: str, name: str, scan_data: Dict[str, Any]):
        cfg = self._get_config()
        app_url = cfg["app_url"]

        classification = scan_data.get("classification", "HIGH RISK")
        risk_score = scan_data.get("risk_score", 0)
        url = scan_data.get("url", "")
        domain = scan_data.get("domain", url)
        ml_pred = scan_data.get("ml_prediction", "PHISHING")
        ml_conf = scan_data.get("ml_confidence", 0.0)
        risk_factors = scan_data.get("risk_factors", [])
        scan_id = scan_data.get("scan_id", "")
        report_url = f"{app_url}/dashboard/scan/{scan_id}" if scan_id else f"{app_url}/dashboard"

        is_critical = classification == "CRITICAL"
        badge_color = "#dc2626" if is_critical else "#f59e0b"
        emoji = "🚨" if is_critical else "⚠"

        subject = f"{emoji} PhishGuard AI — {'CRITICAL' if is_critical else 'High Risk'} Threat Detected ({risk_score}/100)"

        factors_html = "".join([
            f'<li style="margin-bottom:6px;color:#cbd5e1">{f}</li>'
            for f in risk_factors[:6]
        ]) or "<li style='color:#94a3b8'>No specific risk factors recorded</li>"

        html = f"""
        <div style="font-family:Arial,sans-serif;background:#060b14;color:#fff;padding:32px;border-radius:10px;max-width:580px;margin:auto;border:2px solid {badge_color}40">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:28px;font-weight:900;letter-spacing:2px">🕷 PHISHGUARD <span style="color:#ef4444">AI</span></div>
            <div style="font-size:12px;color:#94a3b8;letter-spacing:1px;margin-top:4px">REAL-TIME THREAT ALERT</div>
          </div>

          <div style="background:{badge_color}18;border:1px solid {badge_color}55;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center">
            <div style="font-size:32px;margin-bottom:8px">{emoji}</div>
            <div style="font-size:22px;font-weight:900;color:{badge_color};letter-spacing:1px">{classification}</div>
            <div style="font-size:36px;font-weight:900;color:{badge_color};margin:8px 0">{risk_score}<span style="font-size:16px;color:#94a3b8"> / 100</span></div>
          </div>

          <p style="font-size:14px">Hello <strong>{name}</strong>,</p>
          <p style="color:#94a3b8;font-size:13px">PhishGuard AI Real-Time Protection detected a dangerous URL:</p>

          <div style="background:#0d1a2d;border-radius:8px;padding:16px;margin:16px 0;border:1px solid rgba(255,255,255,0.08)">
            <div style="margin-bottom:10px">
              <span style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Scanned URL</span><br>
              <code style="color:#ef4444;font-size:13px;word-break:break-all">{url}</code>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap">
              <div>
                <span style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">ML Prediction</span><br>
                <strong style="color:{badge_color}">{ml_pred}</strong>
              </div>
              <div>
                <span style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">ML Confidence</span><br>
                <strong style="color:#e2e8f0">{ml_conf*100:.1f}%</strong>
              </div>
              <div>
                <span style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase">Domain</span><br>
                <strong style="color:#e2e8f0">{domain}</strong>
              </div>
            </div>
          </div>

          <div style="margin:20px 0">
            <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Detected Risk Factors</div>
            <ul style="margin:0;padding-left:20px;font-size:13px">{factors_html}</ul>
          </div>

          <div style="background:#1a0a0a;border:1px solid {badge_color}40;border-radius:8px;padding:14px;margin:16px 0">
            <strong style="color:{badge_color}">⚠ RECOMMENDATION:</strong>
            <span style="color:#cbd5e1;font-size:13px"> Do NOT enter passwords, financial information, or personal data on this domain.</span>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="{report_url}" style="background:linear-gradient(135deg,{badge_color},{badge_color}99);color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1px">
              📊 VIEW FULL SECURITY REPORT
            </a>
          </div>

          <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#475569;text-align:center">
            PhishGuard AI · Real-Time Phishing Detection Platform · This alert was generated automatically.
          </div>
        </div>
        """
        text = (
            f"PhishGuard AI — {classification} Threat Detected\n\n"
            f"URL: {url}\nRisk Score: {risk_score}/100\nML: {ml_pred} ({ml_conf*100:.1f}%)\n\n"
            f"Do NOT enter passwords on this domain.\n\nView Report: {report_url}"
        )
        return self._send_email_raw(to_email, subject, html, text)


email_service = EmailService()
