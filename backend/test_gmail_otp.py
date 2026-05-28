#!/usr/bin/env python3
"""
Quick test to send OTP to your Gmail
"""
import os
from dotenv import load_dotenv

load_dotenv()

from email_service import send_otp_email

def test_gmail_otp():
    """Test sending OTP to Gmail"""
    print("=" * 60)
    print("Gmail OTP Test")
    print("=" * 60)
    
    # Get your Gmail from .env or ask
    your_gmail = os.getenv("SMTP_USERNAME")
    if not your_gmail:
        your_gmail = input("Enter your Gmail address: ").strip()
    
    # Check if SMTP is configured
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_username or not smtp_password:
        print("\n[ERROR] Gmail not configured!")
        print("\nTo configure Gmail:")
        print("1. Enable 2-Step Verification on your Gmail")
        print("2. Generate App Password: https://myaccount.google.com/apppasswords")
        print("3. Add to backend/.env:")
        print("   SMTP_SERVER=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USERNAME=your.email@gmail.com")
        print("   SMTP_PASSWORD=your-16-char-app-password")
        print("   FROM_EMAIL=your.email@gmail.com")
        return False
    
    print(f"\nSending OTP to: {your_gmail}")
    print("OTP Code: 1234")
    print("\nSending...")
    
    # Send test OTP
    result = send_otp_email(
        to=your_gmail,
        otp="1234",
        phone_number="+639123456789"
    )
    
    if result.get("success"):
        print("\n[SUCCESS] OTP email sent!")
        print(f"Check your Gmail inbox: {your_gmail}")
        print("Also check Spam/Promotions folder if not in inbox")
        return True
    else:
        print(f"\n[ERROR] Failed to send: {result.get('error')}")
        print("\nTroubleshooting:")
        print("1. Check SMTP_PASSWORD is your Gmail App Password (16 chars)")
        print("2. Make sure 2-Step Verification is enabled")
        print("3. Verify App Password at: https://myaccount.google.com/apppasswords")
        return False

if __name__ == "__main__":
    test_gmail_otp()

