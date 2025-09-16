'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight } from 'lucide-react';

/**
 * Login Page
 * 
 * Corporate authentication page for Stellar Custody MVP
 * Handles email/password login and redirects to TOTP verification
 */
export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      setError(null);
      const result = await login(credentials.email, credentials.password);
      
      if (result.success) {
        if (result.requiresTOTP) {
          // Will be redirected to TOTP verification by auth context
        } else {
          // Direct login success (rare case)
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-stellar-100 rounded-full">
            <Shield className="w-8 h-8 text-stellar-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-corporate-900">
          Guardian Access
        </h1>
        <p className="text-corporate-600">
          Sign in to your Stellar Custody account
        </p>
      </div>

      {/* Login Form */}
      <Card className="corporate-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl corporate-heading">Sign In</CardTitle>
          <CardDescription className="corporate-body">
            Enter your credentials to access the multi-signature custody system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm 
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
          />
        </CardContent>
      </Card>

      {/* Demo Credentials */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-corporate-50 border-corporate-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-corporate-700">
              Demo Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="p-3 bg-white rounded border">
                <div className="font-medium text-stellar-700">CEO Guardian</div>
                <div className="text-corporate-600">ceo@stellarcustody.com</div>
                <div className="text-corporate-600">Password: ceo123456</div>
              </div>
              <div className="p-3 bg-white rounded border">
                <div className="font-medium text-success-700">CFO Guardian</div>
                <div className="text-corporate-600">cfo@stellarcustody.com</div>
                <div className="text-corporate-600">Password: cfo123456</div>
              </div>
              <div className="p-3 bg-white rounded border">
                <div className="font-medium text-warning-700">CTO Guardian</div>
                <div className="text-corporate-600">cto@stellarcustody.com</div>
                <div className="text-corporate-600">Password: cto123456</div>
              </div>
            </div>
            <p className="text-xs text-corporate-500 text-center">
              TOTP Code: 123456 (development mode)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-corporate-500">
        <p>Stellar Custody MVP © 2024</p>
        <p>Enterprise Multi-Signature Solution</p>
      </div>
    </div>
  );
}