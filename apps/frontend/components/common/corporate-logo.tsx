import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Corporate Logo Component
 * 
 * Stellar Custody MVP branding with professional styling
 */

interface CorporateLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

export function CorporateLogo({ 
  size = 'md', 
  variant = 'full',
  className 
}: CorporateLogoProps) {
  const baseClasses = cn(
    "flex items-center space-x-2",
    className
  );

  if (variant === 'icon') {
    return (
      <div className={baseClasses}>
        <div className={cn(
          "rounded-lg bg-gradient-to-br from-stellar-500 to-stellar-700 flex items-center justify-center text-white font-bold",
          sizeClasses[size],
          size === 'sm' ? 'w-6 text-xs' : 
          size === 'md' ? 'w-8 text-sm' :
          size === 'lg' ? 'w-12 text-lg' : 'w-16 text-xl'
        )}>
          <Image src="/favicon.ico" alt="Stellar Custody" width={24} height={24} />
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={baseClasses}>
        <span className={cn(
          "font-bold text-corporate-900",
          size === 'sm' ? 'text-sm' :
          size === 'md' ? 'text-base' :
          size === 'lg' ? 'text-xl' : 'text-2xl'
        )}>
          Stellar Custody
        </span>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <div className={cn(
        "rounded-lg bg-gradient-to-br from-stellar-500 to-stellar-700 flex items-center justify-center text-white font-bold",
        sizeClasses[size],
        size === 'sm' ? 'w-6 text-xs' : 
        size === 'md' ? 'w-8 text-sm' :
        size === 'lg' ? 'w-12 text-lg' : 'w-16 text-xl'
      )}>
          <Image src="/favicon.ico" alt="Stellar Custody" width={24} height={24} />
      </div>
      <div className="flex flex-col">
        <span className={cn(
          "font-bold text-corporate-900 leading-tight",
          size === 'sm' ? 'text-sm' :
          size === 'md' ? 'text-base' :
          size === 'lg' ? 'text-xl' : 'text-2xl'
        )}>
          Stellar Custody
        </span>
        <span className={cn(
          "text-corporate-600 font-medium leading-tight",
          size === 'sm' ? 'text-xs' :
          size === 'md' ? 'text-xs' :
          size === 'lg' ? 'text-sm' : 'text-base'
        )}>
          Multi-Sig
        </span>
      </div>
    </div>
  );
}

/**
 * Corporate Header Logo (for navigation)
 */
export function HeaderLogo() {
  return <CorporateLogo size="md" variant="full" />;
}

/**
 * Corporate Auth Logo (for login pages)
 */
export function AuthLogo() {
  return <CorporateLogo size="xl" variant="full" className="justify-center" />;
}

/**
 * Corporate Favicon Logo (for small spaces)
 */
export function FaviconLogo() {
  return <CorporateLogo size="sm" variant="icon" />;
}
