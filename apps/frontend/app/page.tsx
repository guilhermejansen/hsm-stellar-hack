import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeaderLogo } from '@/components/common/corporate-logo';
import { Shield, Users, Wallet, MessageSquare, Rocket, Lock, CheckCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Stellar Custody — Secure Multi‑Sig for Stellar',
  description: 'Minimal, secure and privacy‑focused multi‑signature custody for Stellar blockchain with HSM DINAMO integration and guardian approvals via WhatsApp.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-corporate-50 dark:from-corporate-950 dark:to-corporate-900">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 w-full border-b border-corporate-200/60 dark:border-corporate-700/60 backdrop-blur-md bg-white/70 dark:bg-corporate-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <HeaderLogo />
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge variant="secondary" className="hidden sm:inline-flex">Testnet Demo</Badge>
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="corporate" className="group">
                Launch App
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-20 dark:opacity-30" aria-hidden>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-stellar-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] bg-corporate-400/30 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">HSM DINAMO + Stellar Testnet</Badge>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-corporate-900 dark:text-corporate-100">
                Secure Multi‑Signature Custody for Stellar
              </h1>
              <p className="mt-4 text-lg text-corporate-600 dark:text-corporate-300 leading-relaxed">
                Approve payments with a 2‑of‑3 guardian scheme, protect privacy using ephemeral keys, and run fully on the Stellar testnet.
                Simple, minimal and production‑minded.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/dashboard">
                  <Button size="lg" variant="corporate" className="w-full sm:w-auto">
                    Try the Demo
                    <Rocket className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sign in
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex items-center space-x-4 text-sm text-corporate-500 dark:text-corporate-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success-600" />
                  <span>WhatsApp approvals</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success-600" />
                  <span>Ephemeral privacy keys</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success-600" />
                  <span>HSM‑backed signing</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-corporate-200 dark:border-corporate-700 bg-white/80 dark:bg-corporate-900/80 shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8">
                  <Image
                    src="/stellar-coin.png"
                    alt="Stellar Custody"
                    width={800}
                    height={600}
                    className="w-full h-auto rounded-xl"
                    priority
                  />
                </div>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-corporate-200 dark:border-corporate-700">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">2‑of‑3 Guardians</Badge>
                    <Badge variant="outline">Testnet</Badge>
                    <Badge variant="outline">Privacy</Badge>
                    <Badge variant="outline">HSM</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Users, title: 'Multi‑Sig Guardians', desc: '2‑of‑3 approvals with distinct CEO/CFO/CTO roles.' },
            { icon: Shield, title: 'Privacy by Design', desc: 'Ephemeral keys prevent address correlation and tracking.' },
            { icon: Wallet, title: 'Hot & Cold Wallets', desc: 'Operate with separate hot and cold custody flows.' },
            { icon: MessageSquare, title: 'WhatsApp Approvals', desc: 'Guardian approvals via secure WhatsApp actions.' },
            { icon: Lock, title: 'HSM DINAMO', desc: 'Hardware‑backed security for key management and signing.' },
            { icon: Rocket, title: 'Testnet‑Ready', desc: 'Auto‑create and fund accounts on Stellar testnet.' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="corporate-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-stellar-100 dark:bg-stellar-900 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-stellar-600" />
                </div>
                <h3 className="text-lg font-semibold text-corporate-900 dark:text-corporate-100">{title}</h3>
                <p className="mt-1.5 text-sm text-corporate-600 dark:text-corporate-300">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-2xl border border-corporate-200 dark:border-corporate-700 bg-white/70 dark:bg-corporate-900/70 p-6 sm:p-10">
          <h2 className="text-2xl font-bold text-corporate-900 dark:text-corporate-100">How it works</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {[ 
              { step: '1', title: 'Create a transaction', text: 'Choose wallet, destination and amount. Thresholds are set automatically.' },
              { step: '2', title: 'Collect approvals', text: 'Guardians receive WhatsApp prompts and approve using TOTP.' },
              { step: '3', title: 'Execute on Stellar', text: 'Funds are sent from an ephemeral address for privacy.' },
            ].map(({ step, title, text }) => (
              <div key={step} className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-stellar-100 dark:bg-stellar-900 flex items-center justify-center text-stellar-700 font-semibold">
                  {step}
                </div>
                <div>
                  <h3 className="font-medium text-corporate-900 dark:text-corporate-100">{title}</h3>
                  <p className="text-sm text-corporate-600 dark:text-corporate-300 mt-1">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button variant="corporate" size="lg">
                Launch Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-corporate-200 dark:border-corporate-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-sm text-corporate-600 dark:text-corporate-300 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <HeaderLogo />
            <span className="text-corporate-400">•</span>
            <span>Stellar testnet demo • Privacy‑first multi‑sig</span>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center space-x-4">
            <Link href="/login" className="hover:underline">Sign in</Link>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
