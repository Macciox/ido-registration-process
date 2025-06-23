import * as React from 'react';

interface EmailTemplateProps {
  code: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  code,
}) => (
  <div>
    <h2>Verify your email</h2>
    <p>Thank you for registering with Decubate IDO. To complete your registration, please enter the following verification code:</p>
    <h3 style={{ fontSize: '24px', letterSpacing: '2px', textAlign: 'center', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>{code}</h3>
    <p>This code will expire in 30 minutes.</p>
    <p>If you did not request this verification, please ignore this email.</p>
  </div>
);