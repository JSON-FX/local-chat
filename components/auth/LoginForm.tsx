'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const SSO_LOGIN_URL = process.env.NEXT_PUBLIC_SSO_LOGIN_URL || 'http://lgu-sso-ui.test/sso/login';
const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || '';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error === 'auth_failed') {
      toast.error('Authentication failed. Please try again.');
    } else if (error === 'missing_params') {
      toast.error('Invalid authentication response.');
    }
  }, [error]);

  const handleSsoLogin = () => {
    setIsRedirecting(true);

    // Generate CSRF state
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    sessionStorage.setItem('sso_state', state);

    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/sso/callback`);
    const loginUrl = `${SSO_LOGIN_URL}?client_id=${SSO_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}`;

    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Branding */}
      <div className="relative lg:w-1/2 bg-[oklch(0.205_0.03_265)] overflow-hidden flex flex-col justify-between p-8 lg:p-12 min-h-[280px] lg:min-h-screen">
        {/* Abstract decorative elements */}
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-[oklch(0.59_0.16_255_/_15%)] blur-[80px]" />
        <div className="absolute bottom-[-120px] left-[-60px] w-[500px] h-[500px] rounded-full bg-[oklch(0.63_0.14_195_/_10%)] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] border border-white/5 rounded-3xl rotate-45" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-white/[3%] rounded-[40px] rotate-[25deg]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <Image
            src="/lgu-seal.png"
            alt="LGU Seal"
            width={56}
            height={56}
            className="object-contain"
          />
          <span className="font-bold text-xl text-white">LGU-Chat</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h1 className="text-[36px] lg:text-[48px] font-extrabold text-white leading-tight">
            Connect.<br />Collaborate.<br />Communicate.
          </h1>
          <p className="mt-4 text-base lg:text-lg text-[oklch(0.65_0.015_260)] leading-relaxed">
            The official messaging platform for the<br />
            Local Government of Quezon Bukidnon.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 bg-[oklch(0.98_0.002_250)] flex flex-col items-center justify-center p-8 lg:p-12 relative">
        <div className="w-full max-w-[380px]">
          {/* Icon */}
          <Image
            src="/lgu-seal.png"
            alt="LGU Seal"
            width={80}
            height={80}
            className="object-contain mb-8"
          />

          <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to your account</h2>
          <p className="text-base text-muted-foreground mb-8">Access your secure government workspace</p>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive mb-5"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {error === 'auth_failed'
                  ? 'Authentication failed. Please try again.'
                  : 'An error occurred during sign in.'}
              </span>
            </div>
          )}

          <Button
            onClick={handleSsoLogin}
            className="w-full h-12 text-sm font-semibold"
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Redirecting to SSO...
              </>
            ) : (
              <>
                Sign in with LGU-SSO
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>

          {/* Security badge */}
          <div className="flex items-center gap-2 mt-5 p-3 bg-white rounded-xl border border-border">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Secured with Single Sign-On authentication</span>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
            You will be redirected to the LGU Single Sign-On portal to enter your credentials.
          </p>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-4 text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Local Government of Quezon Bukidnon. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
