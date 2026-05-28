"""
Email Service - Nodemailer-like API for Python
Simple and easy email sending, similar to nodemailer
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, List
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    """Simple email service similar to nodemailer"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.app_name = os.getenv("APP_NAME", "EzSAKAY")
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
    
    def send(self, to: str, subject: str, html: str = None, text: str = None) -> Dict:
        """
        Send email - similar to nodemailer.sendMail()
        
        Args:
            to: Recipient email address
            subject: Email subject
            html: HTML content (optional)
            text: Plain text content (optional)
        
        Returns:
            Dict with success status and message
        """
        if not self.smtp_username or not self.smtp_password:
            error_msg = "Email not configured. Add SMTP settings to .env"
            print(f"*** {error_msg} ***")
            if self.debug:
                return {"success": False, "error": error_msg}
            raise ValueError(error_msg)
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to
            msg['Subject'] = subject
            
            # Add content
            if html:
                msg.attach(MIMEText(html, 'html'))
            if text:
                msg.attach(MIMEText(text, 'plain'))
            elif not html:
                # Default to text if nothing provided
                msg.attach(MIMEText(text or '', 'plain'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            print(f"*** Email sent successfully to {to} ***")
            return {"success": True, "message": "Email sent successfully"}
            
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            print(f"*** {error_msg} ***")
            if self.debug:
                return {"success": False, "error": error_msg}
            raise Exception(error_msg)
    
    def send_otp(self, to: str, otp: str, phone_number: str = None) -> Dict:
        """
        Send OTP verification email
        
        Args:
            to: Recipient email address
            otp: 4 or 6 digit OTP code
            phone_number: Phone number (for display)
        
        Returns:
            Dict with success status
        """
        subject = f"{self.app_name} - Verification Code"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #ff5722;
                    margin-bottom: 10px;
                }}
                .otp-code {{
                    text-align: center;
                    margin: 30px 0;
                }}
                .otp-number {{
                    font-size: 48px;
                    font-weight: bold;
                    color: #ff5722;
                    letter-spacing: 8px;
                    padding: 20px;
                    background-color: #fff3f0;
                    border-radius: 8px;
                    display: inline-block;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #666;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚌 {self.app_name}</div>
                    <h2>Verification Code</h2>
                </div>
                
                <p>Hello!</p>
                
                <p>Your verification code is:</p>
                
                <div class="otp-code">
                    <div class="otp-number">{otp}</div>
                </div>
                
                {f'<p style="text-align: center; color: #666;">For phone number: {phone_number}</p>' if phone_number else ''}
                
                <p><strong>This code will expire in 5 minutes.</strong></p>
                
                <p>If you didn't request this code, please ignore this email.</p>
                
                <div class="footer">
                    <p>© {self.app_name} - Ride Sharing App</p>
                    <p>This is an automated message. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        {self.app_name} - Verification Code
        
        Your verification code is: {otp}
        
        {f'For phone number: {phone_number}' if phone_number else ''}
        
        This code will expire in 5 minutes.
        
        If you didn't request this code, please ignore this email.
        """
        
        return self.send(to=to, subject=subject, html=html, text=text)

# Create a global instance for easy importing
email_service = EmailService()

# Convenience functions (nodemailer-style)
def send_email(to: str, subject: str, html: str = None, text: str = None) -> Dict:
    """Send an email - nodemailer style"""
    return email_service.send(to=to, subject=subject, html=html, text=text)

def send_otp_email(to: str, otp: str, phone_number: str = None) -> Dict:
    """Send OTP email - nodemailer style"""
    return email_service.send_otp(to=to, otp=otp, phone_number=phone_number)

