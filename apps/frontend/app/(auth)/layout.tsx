import type { Metadata } from 'next';
import { AuthLogo } from '@/components/common/corporate-logo';

export const metadata: Metadata = {
  title: 'Authentication | Stellar Custody MVP',
  description: 'Secure authentication for Stellar Custody Multi-Signature System',
};

/**
 * Authentication Layout
 * 
 * Clean, professional layout for login and TOTP verification pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-50 via-stellar-50 to-corporate-100">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-gradient-to-br from-stellar-600 via-stellar-700 to-stellar-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <AuthLogo />
            </div>
            <h1 className="text-4xl font-bold mb-6 leading-tight">
              Multi-Signature
              <br />
              Custody System
            </h1>
            <p className="text-xl text-stellar-100 mb-8 leading-relaxed">
              Enterprise-grade security for Stellar blockchain assets with hardware protection and 3-guardian approval system.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                <span className="text-stellar-100">HSM Hardware Security Module</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                <span className="text-stellar-100">2-of-3 Multi-Signature Approval</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                <span className="text-stellar-100">TOTP Authentication</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                <span className="text-stellar-100">Privacy Protection</span>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-1/4 right-0 w-64 h-64 bg-stellar-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-stellar-300/10 rounded-full blur-2xl"></div>
        </div>
        
        {/* Right Side - Authentication Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}