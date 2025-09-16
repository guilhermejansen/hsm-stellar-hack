'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { guardianAPI } from '@/lib/api';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Shield, 
  ArrowLeft, 
  Phone, 
  Mail, 
  User, 
  CreditCard,
  MapPin,
  Calendar,
  Globe,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

/**
 * Guardian Registration Schema
 */
const guardianSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (+55...)'),
  role: z.enum(['CEO', 'CFO', 'CTO'], { required_error: 'Please select a role' }),
  level: z.number().min(1).max(3),
  kycData: z.object({
    fullName: z.string().min(2, 'Full name required'),
    documentId: z.string().min(5, 'Document ID required'),
    address: z.string().min(10, 'Complete address required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format: YYYY-MM-DD'),
    nationality: z.string().min(2, 'Nationality required'),
    occupation: z.string().min(2, 'Occupation required'),
  }),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

/**
 * Guardian Registration Page
 * 
 * Complete KYC and guardian registration with HSM partition creation
 */
export default function RegisterGuardianPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [totpCode, setTotpCode] = useState('');

  const form = useForm<GuardianFormData>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '+55',
      role: undefined,
      level: 2,
      kycData: {
        fullName: '',
        documentId: '',
        address: '',
        dateOfBirth: '',
        nationality: 'Brazilian',
        occupation: '',
      },
    },
  });

  // Register guardian mutation
  const registerMutation = useMutation({
    mutationFn: (data: { guardianData: GuardianFormData; totpCode: string }) =>
      guardianAPI.registerGuardian(data.guardianData, data.totpCode),
    onSuccess: (result) => {
      toast.success('Guardian registered successfully! TOTP QR code sent via WhatsApp.');
      router.push('/dashboard/guardians');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Registration failed');
    },
  });

  const onSubmit = async (data: GuardianFormData) => {
    if (!totpCode || totpCode.length !== 6) {
      toast.error('Please enter your 6-digit TOTP code to authorize registration');
      return;
    }

    try {
      await registerMutation.mutateAsync({
        guardianData: data,
        totpCode,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const canRegister = user?.role === 'CEO' || (user?.level && user.level >= 3);

  if (!canRegister) {
    return (
      <div className="space-y-6">
        <Alert variant="warning">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            Guardian registration requires CEO privileges or Level 3 access.
          </AlertDescription>
        </Alert>
        <Link href="/dashboard/guardians">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guardians
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900">Register Guardian</h1>
          <p className="text-corporate-600 mt-1">
            Add a new guardian to the multi-signature system with complete KYC and HSM setup
          </p>
        </div>
        <Link href="/dashboard/guardians">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guardians
          </Button>
        </Link>
      </div>

      {/* Registration Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-stellar-600" />
                  Guardian Information
                </CardTitle>
                <CardDescription>
                  Basic guardian details and role assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="João Silva Santos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ceo@stellarcustody.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+5511999999001" {...field} />
                      </FormControl>
                      <FormDescription>
                        International format for WhatsApp notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CEO">CEO</SelectItem>
                            <SelectItem value="CFO">CFO</SelectItem>
                            <SelectItem value="CTO">CTO</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permission Level</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Level 1 - Basic</SelectItem>
                            <SelectItem value="2">Level 2 - Standard</SelectItem>
                            <SelectItem value="3">Level 3 - Full Access</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* KYC Information */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-stellar-600" />
                  KYC Information
                </CardTitle>
                <CardDescription>
                  Know Your Customer data for HSM partition creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="kycData.fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="João Silva Santos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kycData.documentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document ID</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678901" {...field} />
                      </FormControl>
                      <FormDescription>CPF, SSN, or national ID</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kycData.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complete Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Rua das Flores, 123, Apt 45, São Paulo, SP, Brazil"
                          className="resize-none"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="kycData.dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kycData.nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationality</FormLabel>
                        <FormControl>
                          <Input placeholder="Brazilian" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="kycData.occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="Chief Executive Officer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Authorization */}
          <Card className="corporate-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-warning-600" />
                Authorization Required
              </CardTitle>
              <CardDescription>
                Enter your TOTP code to authorize guardian registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="authTotp">Your TOTP Code</Label>
                  <Input
                    id="authTotp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="text-center text-lg font-mono max-w-32"
                  />
                  <p className="text-sm text-corporate-600">
                    Required for guardian registration authorization
                  </p>
                </div>

                <Alert variant="info">
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Security Process:</strong> Guardian registration creates an individual HSM partition, 
                    generates TOTP secret, and sends QR code via WhatsApp for activation.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4">
            <Link href="/dashboard/guardians">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </Link>
            
            <Button
              type="submit"
              variant="corporate"
              size="lg"
              disabled={!form.formState.isValid || totpCode.length !== 6 || registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registering Guardian...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register Guardian
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}