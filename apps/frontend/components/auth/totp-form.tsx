'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, Clock, RefreshCw } from 'lucide-react';

/**
 * TOTP form schema
 */
const totpSchema = z.object({
  totpCode: z
    .string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'TOTP code must contain only numbers'),
});

type TOTPFormData = z.infer<typeof totpSchema>;

interface TOTPFormProps {
  onSubmit: (totpCode: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function TOTPForm({ onSubmit, isLoading, error }: TOTPFormProps) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [progress, setProgress] = useState(100);
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TOTPFormData>({
    resolver: zodResolver(totpSchema),
    defaultValues: {
      totpCode: '',
    },
  });

  const totpCode = watch('totpCode');

  // TOTP timer simulation (30 seconds cycle)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setProgress(100);
          return 30;
        }
        const newTime = prev - 1;
        setProgress((newTime / 30) * 100);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-focus on input
  useEffect(() => {
    const input = document.getElementById('totpCode') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  const handleFormSubmit = async (data: TOTPFormData) => {
    try {
      await onSubmit(data.totpCode);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleRefreshCode = () => {
    reset();
    setTimeRemaining(30);
    setProgress(100);
    const input = document.getElementById('totpCode') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const getProgressColor = () => {
    if (timeRemaining > 20) return 'bg-success-500';
    if (timeRemaining > 10) return 'bg-warning-500';
    return 'bg-error-500';
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* TOTP Timer */}
      <div className="bg-corporate-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-corporate-600" />
            <span className="text-sm font-medium text-corporate-700">
              Code Refresh Timer
            </span>
          </div>
          <span className="text-sm font-mono text-corporate-600">
            {timeRemaining}s
          </span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2" />
          <div 
            className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-corporate-500 text-center">
          Code refreshes every 30 seconds
        </p>
      </div>

      {/* TOTP Code Field */}
      <div className="space-y-2">
        <Label htmlFor="totpCode" className="text-sm font-medium text-corporate-700">
          TOTP Verification Code
        </Label>
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-corporate-400 w-4 h-4" />
          <Input
            id="totpCode"
            type="text"
            placeholder="000000"
            maxLength={6}
            className="pl-10 text-center text-2xl font-mono tracking-widest corporate-input"
            {...register('totpCode')}
            disabled={isLoading || isSubmitting}
            onChange={(e) => {
              // Auto-format and limit to numbers only
              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
              e.target.value = value;
            }}
          />
        </div>
        {errors.totpCode && (
          <p className="text-sm text-error-600">{errors.totpCode.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="corporate"
        size="lg"
        className="w-full"
        disabled={isLoading || isSubmitting || totpCode?.length !== 6}
      >
        {isLoading || isSubmitting ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            Verify & Access Dashboard
            <Shield className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {/* Refresh Button */}
      <div className="text-center">
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handleRefreshCode}
          disabled={isLoading || isSubmitting}
          className="text-corporate-600 hover:text-corporate-900"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Code Input
        </Button>
      </div>

      {/* Security Notice */}
      <div className="bg-stellar-50 border border-stellar-200 rounded p-3">
        <p className="text-xs text-stellar-700 text-center">
          <Shield className="w-3 h-3 inline mr-1" />
          Your TOTP code is validated against your HSM partition for maximum security
        </p>
      </div>
    </form>
  );
}