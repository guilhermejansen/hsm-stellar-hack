'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuardianRoleBadge } from '@/components/common/status-badge';
import { formatDate } from '@/lib/utils';
import { 
  User, 
  Shield, 
  Phone, 
  Mail, 
  Key, 
  Activity,
  Clock,
  CheckCircle,
  Settings,
  Lock,
  Smartphone
} from 'lucide-react';

/**
 * User Profile Page
 * 
 * Guardian profile management and security settings
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return <div>User not found</div>;
  }

  // Mock user data - in real implementation, fetch from API
  const mockUserData = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: '+5511999999001',
    role: user.role,
    level: user.level || 2,
    isGuardian: user.isGuardian,
    hsmActivated: user.hsmActivated,
    totpVerified: true,
    stellarPublicKey: 'GAK2TU742A57ERQWNAZ5YEJJAUJUBUNWX2C6BYLIF2ZRVRYFR43ATJDT',
    hsmPartitionId: 'user_ceo_partition_001',
    createdAt: '2024-12-01T09:00:00Z',
    lastLoginAt: '2024-12-14T10:30:00Z',
    totalApprovals: 42,
    lastApprovalAt: '2024-12-14T09:45:00Z',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">
            Profile Settings
          </h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            Manage your account information and security settings
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          <Settings className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-stellar-600" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Your personal and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={mockUserData.name}
                    disabled={!isEditing}
                    className="corporate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-corporate-500" />
                    <Input
                      id="email"
                      value={mockUserData.email}
                      disabled={!isEditing}
                      className="corporate-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-corporate-500" />
                    <Input
                      id="phone"
                      value={mockUserData.phone}
                      disabled={!isEditing}
                      className="corporate-input"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex space-x-2 pt-4">
                    <Button variant="corporate" size="sm">
                      Save Changes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guardian Status */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-warning-600" />
                  Guardian Status
                </CardTitle>
                <CardDescription>
                  Your role and permissions in the multi-signature system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.isGuardian ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-stellar-50 dark:bg-stellar-900/20 rounded-lg">
                        <GuardianRoleBadge role={user.role!} />
                        <div className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                          Guardian Role
                        </div>
                      </div>
                      <div className="text-center p-3 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                        <Badge variant="outline">Level {mockUserData.level}</Badge>
                        <div className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
                          Permission Level
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-corporate-600 dark:text-corporate-300">HSM Activated</span>
                        <Badge variant={user.hsmActivated ? 'success' : 'warning'}>
                          {user.hsmActivated ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-corporate-600 dark:text-corporate-300">TOTP Verified</span>
                        <Badge variant={mockUserData.totpVerified ? 'success' : 'warning'}>
                          {mockUserData.totpVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-corporate-600 dark:text-corporate-300">Total Approvals</span>
                        <span className="font-bold text-corporate-900 dark:text-corporate-100">
                          {mockUserData.totalApprovals}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <Shield className="w-4 h-4" />
                    <AlertDescription>
                      You are not a guardian. Contact your administrator for guardian privileges.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOTP Settings */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="w-5 h-5 mr-2 text-success-600" />
                  TOTP Authentication
                </CardTitle>
                <CardDescription>
                  Manage your Time-based One-Time Password settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-success-900 dark:text-success-100">
                      TOTP Active
                    </div>
                    <div className="text-sm text-success-600 dark:text-success-400">
                      Google Authenticator configured
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-success-500" />
                </div>

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Reset TOTP Secret
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    View Backup Codes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* HSM Information */}
            <Card className="corporate-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-stellar-600" />
                  HSM Partition
                </CardTitle>
                <CardDescription>
                  Hardware Security Module partition information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600 dark:text-corporate-300">Partition ID</span>
                    <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
                      {mockUserData.hsmPartitionId}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600 dark:text-corporate-300">Stellar Address</span>
                    <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
                      {mockUserData.stellarPublicKey.slice(0, 8)}...{mockUserData.stellarPublicKey.slice(-8)}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-corporate-600 dark:text-corporate-300">Status</span>
                    <Badge variant={user.hsmActivated ? 'success' : 'warning'}>
                      {user.hsmActivated ? 'Active' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="corporate-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-stellar-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your recent actions and system interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-success-500" />
                    <div>
                      <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                        Last Login
                      </div>
                      <div className="text-xs text-corporate-600 dark:text-corporate-300">
                        Successfully authenticated
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">
                    {formatDate(mockUserData.lastLoginAt)}
                  </div>
                </div>

                {user.isGuardian && mockUserData.lastApprovalAt && (
                  <div className="flex items-center justify-between p-3 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-4 h-4 text-stellar-500" />
                      <div>
                        <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                          Last Approval
                        </div>
                        <div className="text-xs text-corporate-600 dark:text-corporate-300">
                          Transaction approval completed
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-corporate-600 dark:text-corporate-300">
                      {formatDate(mockUserData.lastApprovalAt)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-corporate-50 dark:bg-corporate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-corporate-500" />
                    <div>
                      <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                        Account Created
                      </div>
                      <div className="text-xs text-corporate-600 dark:text-corporate-300">
                        Guardian registration completed
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-corporate-600 dark:text-corporate-300">
                    {formatDate(mockUserData.createdAt)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="corporate-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2 text-corporate-600" />
                Application Preferences
              </CardTitle>
              <CardDescription>
                Customize your application experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                      Email Notifications
                    </div>
                    <div className="text-xs text-corporate-600 dark:text-corporate-300">
                      Receive email alerts for important events
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                      WhatsApp Notifications
                    </div>
                    <div className="text-xs text-corporate-600 dark:text-corporate-300">
                      Receive approval requests via WhatsApp
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-corporate-900 dark:text-corporate-100">
                      Session Timeout
                    </div>
                    <div className="text-xs text-corporate-600 dark:text-corporate-300">
                      Automatic logout after inactivity
                    </div>
                  </div>
                  <Badge variant="outline">24 hours</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}