'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { TOTPForm } from '@/components/auth/totp-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Clock } from 'lucide-react';

/**
 * TOTP Verification Page
 * 
 * Guardian TOTP verification for complete authentication
 */
export default function VerifyTOTPPage() {
  const { verifyTOTP, logout, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTOTPVerification = async (totpCode: string) => {
    try {
      setError(null);
      const result = await verifyTOTP(totpCode);
      
      if (result.success) {
        // Will be redirected to dashboard by auth context
      } else {
        setError(result.error || 'TOTP verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleBackToLogin = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-warning-100 rounded-full">
            <Shield className="w-8 h-8 text-warning-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-corporate-900">
          Two-Factor Authentication
        </h1>
        <p className="text-corporate-600">
          Enter your 6-digit code from Google Authenticator
        </p>
      </div>

      {/* TOTP Form */}
      <Card className="corporate-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl corporate-heading">Verification Required</CardTitle>
          <CardDescription className="corporate-body">
            Guardian access requires TOTP verification for security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TOTPForm 
            onSubmit={handleTOTPVerification}
            isLoading={isLoading}
            error={error}
          />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-corporate-50 border-corporate-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-corporate-700 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Authentication Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm text-corporate-600">
            <div className="flex items-start space-x-2">
              <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium">1</span>
              <span>Open your Google Authenticator app</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium">2</span>
              <span>Find "Stellar Custody MVP" in your authenticator</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium">3</span>
              <span>Enter the current 6-digit code</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-stellar-100 text-stellar-700 rounded px-1.5 py-0.5 text-xs font-medium">4</span>
              <span>Codes refresh every 30 seconds</span>
            </div>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded">
              <p className="text-xs text-warning-700 font-medium">
                Development Mode: Use code <code className="bg-warning-100 px-1 rounded">123456</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back to Login */}
      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={handleBackToLogin}
          className="text-corporate-600 hover:text-corporate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
      </div>
    </div>
  );
}