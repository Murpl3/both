#!/usr/bin/env python3
"""Test script to send a test email and verify SMTP configuration"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

print("=" * 50)
print("Email Configuration Test")
print("=" * 50)

# Get email settings
smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
smtp_port = int(os.getenv("SMTP_PORT", "587"))
smtp_username = os.getenv("SMTP_USERNAME")
smtp_password = os.getenv("SMTP_PASSWORD")
from_email = os.getenv("FROM_EMAIL", smtp_username)
test_email = input("Enter your email to send test OTP to: ").strip()

print(f"\n1. SMTP Server: {smtp_server}")
print(f"2. SMTP Port: {smtp_port}")
print(f"3. SMTP Username: {smtp_username if smtp_username else 'NOT SET'}")
print(f"4. SMTP Password: {'SET' if smtp_password else 'NOT SET'}")
print(f"5. From Email: {from_email if from_email else 'NOT SET'}")
print(f"6. Test Email: {test_email}")

if not smtp_username or not smtp_password:
    print("\n❌ ERROR: SMTP_USERNAME or SMTP_PASSWORD not set in .env")
    print("\nAdd to backend/.env:")
    print("SMTP_SERVER=smtp.gmail.com")
    print("SMTP_PORT=587")
    print("SMTP_USERNAME=your.email@gmail.com")
    print("SMTP_PASSWORD=your-app-password")
    print("FROM_EMAIL=your.email@gmail.com")
    exit(1)

print("\n" + "=" * 50)
print("Attempting to send test email...")
print("=" * 50)

try:
    # Create email
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = test_email
    msg['Subject'] = "EzSAKAY - Test OTP Code"
    
    otp = "123456"  # Test OTP
    body = f"""
    <html>
      <body>
        <h2>Test Email from EzSAKAY</h2>
        <p>This is a test email to verify SMTP configuration.</p>
        <p>Your test OTP code is:</p>
        <h1 style="color: #ff5722; font-size: 32px;">{otp}</h1>
        <p>If you received this, your email configuration is working!</p>
      </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))
    
    # Send email
    print(f"\nConnecting to {smtp_server}:{smtp_port}...")
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        print("Starting TLS...")
        server.starttls()
        print(f"Logging in as {smtp_username}...")
        server.login(smtp_username, smtp_password)
        print(f"Sending email to {test_email}...")
        server.send_message(msg)
        print("\n✅ Email sent successfully!")
        print(f"✅ Check your inbox at: {test_email}")
        print("✅ Also check spam/junk folder if not in inbox")
        
except smtplib.SMTPAuthenticationError as e:
    print(f"\n❌ Authentication failed: {e}")
    print("\nCommon fixes:")
    print("1. For Gmail: Use App Password, not regular password")
    print("2. Enable 2-Step Verification on Gmail")
    print("3. Generate new App Password: https://myaccount.google.com/apppasswords")
    print("4. Make sure no spaces in App Password")
    
except smtplib.SMTPException as e:
    print(f"\n❌ SMTP Error: {e}")
    print("\nCheck:")
    print("1. SMTP_SERVER and SMTP_PORT are correct")
    print("2. Firewall allows outbound SMTP")
    print("3. Internet connection is working")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print(f"Error type: {type(e).__name__}")

print("\n" + "=" * 50)

