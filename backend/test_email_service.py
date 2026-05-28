#!/usr/bin/env python3
"""
Test Email Service - Nodemailer Style
Similar to testing nodemailer in Node.js
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from email_service import send_email, send_otp_email, email_service

def test_simple_email():
    """Test sending a simple email"""
    print("\n" + "="*50)
    print("Testing Simple Email...")
    print("="*50)
    
    result = send_email(
        to=os.getenv("SMTP_USERNAME", "test@example.com"),  # Send to yourself for testing
        subject="Test Email from EzSAKAY",
        html="""
        <html>
            <body>
                <h1 style="color: #ff5722;">Hello from EzSAKAY!</h1>
                <p>This is a test email sent using our nodemailer-style service.</p>
                <p>If you receive this, the email service is working! 🎉</p>
            </body>
        </html>
        """,
        text="Hello from EzSAKAY! This is a test email."
    )
    
    print(f"Result: {result}")
    return result.get("success", False)

def test_otp_email():
    """Test sending OTP email"""
    print("\n" + "="*50)
    print("Testing OTP Email...")
    print("="*50)
    
    test_otp = "1234"
    test_phone = "+639123456789"
    
    result = send_otp_email(
        to=os.getenv("SMTP_USERNAME", "test@example.com"),  # Send to yourself for testing
        otp=test_otp,
        phone_number=test_phone
    )
    
    print(f"Result: {result}")
    print(f"OTP sent: {test_otp} for {test_phone}")
    return result.get("success", False)

def test_email_service_config():
    """Check email service configuration"""
    print("\n" + "="*50)
    print("Email Service Configuration")
    print("="*50)
    
    print(f"SMTP Server: {email_service.smtp_server}")
    print(f"SMTP Port: {email_service.smtp_port}")
    print(f"From Email: {email_service.from_email}")
    print(f"Username: {'SET' if email_service.smtp_username else 'NOT SET'}")
    print(f"Password: {'SET' if email_service.smtp_password else 'NOT SET'}")
    print(f"Debug Mode: {email_service.debug}")
    
    if not email_service.smtp_username or not email_service.smtp_password:
        print("\n⚠️  WARNING: SMTP_USERNAME or SMTP_PASSWORD not set in .env")
        print("   Email sending will fail. Please configure your .env file.")
        return False
    
    return True

def main():
    """Run all tests"""
    print("\n" + "="*50)
    print("Email Service Test Suite")
    print("="*50)
    
    # Check configuration
    config_ok = test_email_service_config()
    
    if not config_ok:
        print("\n[ERROR] Configuration check failed. Please update your .env file.")
        return
    
    # Test OTP email (most common use case)
    print("\nStarting email tests...")
    otp_success = test_otp_email()
    
    # Test simple email
    # Uncomment to test simple email sending
    # simple_success = test_simple_email()
    
    # Summary
    print("\n" + "="*50)
    print("Test Summary")
    print("="*50)
    print(f"OTP Email: {'SUCCESS' if otp_success else 'FAILED'}")
    
    if otp_success:
        print("\n[SUCCESS] Email service is working correctly!")
        print("   Check your inbox for the test OTP email.")
    else:
        print("\n[ERROR] Email sending failed.")
        print("   Check your .env configuration and SMTP settings.")
    
    print("="*50 + "\n")

if __name__ == "__main__":
    main()

