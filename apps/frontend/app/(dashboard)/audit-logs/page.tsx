'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdvancedTable } from '@/components/common/advanced-table';
import { formatDate } from '@/lib/utils';
import { 
  Activity, 
  Shield, 
  User, 
  Database, 
  Key,
  Search,
  Filter,
  Download,
  Eye,
  Label
} from 'lucide-react';

/**
 * Audit Logs Page
 * 
 * Complete audit trail for compliance and security monitoring
 */

// Mock audit log data
const mockAuditLogs = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    userId: 'clrx1234567890user01',
    userName: 'João Silva Santos',
    action: 'transaction.approved',
    resource: 'transaction',
    result: 'success',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    authMethod: 'OCRA_LIKE',
    hsmPartition: 'user_ceo_partition_001',
    details: 'Approved transaction #abc123 for 5,000 XLM',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    userId: 'clrx1234567890user02',
    userName: 'Maria Oliveira Santos',
    action: 'guardian.totp_verified',
    resource: 'authentication',
    result: 'success',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0...',
    authMethod: 'TOTP',
    details: 'TOTP verification for guardian access',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    userId: 'system',
    userName: 'System',
    action: 'ephemeral_key_generated',
    resource: 'hsm',
    result: 'success',
    ip: 'internal',
    userAgent: 'backend-service',
    hsmPartition: 'user_ceo_partition_001',
    details: 'Generated ephemeral transaction key m/0\'/0\'/42\'',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    userId: 'clrx1234567890user03',
    userName: 'Pedro Almeida Santos',
    action: 'wallet.rebalance',
    resource: 'wallet',
    result: 'success',
    ip: '192.168.1.102',
    userAgent: 'Mozilla/5.0...',
    authMethod: 'TOTP',
    details: 'Rebalanced wallets: moved 1,000 XLM from Hot to Cold',
  },
];

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Define table columns
  const columns = [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {formatDate(row.original.timestamp)}
        </div>
      ),
    },
    {
      accessorKey: 'userName',
      header: 'User',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium text-corporate-900 dark:text-corporate-100">
            {row.original.userName}
          </div>
          <div className="text-xs text-corporate-600 dark:text-corporate-300">
            {row.original.userId.slice(-8)}...
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }: any) => (
        <div>
          <code className="text-sm bg-corporate-100 dark:bg-corporate-800 px-2 py-1 rounded">
            {row.original.action}
          </code>
          <div className="text-xs text-corporate-600 dark:text-corporate-300 mt-1">
            {row.original.resource}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }: any) => (
        <Badge variant={row.original.result === 'success' ? 'success' : 'error'}>
          {row.original.result}
        </Badge>
      ),
    },
    {
      accessorKey: 'authMethod',
      header: 'Auth Method',
      cell: ({ row }: any) => (
        row.original.authMethod ? (
          <Badge variant={row.original.authMethod === 'OCRA_LIKE' ? 'success' : 'warning'}>
            {row.original.authMethod}
          </Badge>
        ) : (
          <span className="text-xs text-corporate-500">-</span>
        )
      ),
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }: any) => (
        <div className="max-w-md">
          <p className="text-sm text-corporate-600 dark:text-corporate-300 truncate">
            {row.original.details}
          </p>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-900 dark:text-corporate-100">
            Audit Logs
          </h1>
          <p className="text-corporate-600 dark:text-corporate-300 mt-1">
            Complete audit trail for compliance and security monitoring
          </p>
        </div>
        <Button variant="corporate">
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-stellar-600" />
            Filter Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="transaction">Transaction</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="hsm">HSM Operation</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-filter">Result</Label>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Results</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-filter">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  <SelectItem value="ceo">CEO Guardian</SelectItem>
                  <SelectItem value="cfo">CFO Guardian</SelectItem>
                  <SelectItem value="cto">CTO Guardian</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setActionFilter('');
                  setResultFilter('');
                  setUserFilter('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="corporate-card">
        <CardHeader>
          <CardTitle>System Audit Trail</CardTitle>
          <CardDescription>
            Complete record of all system activities and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvancedTable
            data={mockAuditLogs}
            columns={columns}
            searchPlaceholder="Search audit logs..."
            enableGlobalFilter={true}
            enableSorting={true}
            enablePagination={true}
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}