'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { BetaNotice } from '@/components/ui/beta-notice';

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
    <div className="min-h-screen flex flex-col bg-muted/40">
      <BetaNotice variant="warning" dismissible={false} persistent={true} />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-md">
                <Image
                  src="/lgu-seal.png"
                  alt="LGU Seal"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to LGU-Chat</CardTitle>
            <CardDescription>
              Sign in through the LGU Single Sign-On system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
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
              className="w-full h-12 text-base"
              disabled={isRedirecting}
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                  Redirecting to SSO...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" aria-hidden="true" />
                  Sign in with LGU-SSO
                </>
              )}
            </Button>


            <p className="text-center text-xs text-muted-foreground mt-4">
              You will be redirected to the LGU Single Sign-On portal to enter your credentials.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
