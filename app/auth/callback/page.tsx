'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const state = searchParams.get('state');

    if (!token || !state) {
      setError('Missing authentication parameters.');
      return;
    }

    // Validate CSRF state
    const savedState = sessionStorage.getItem('sso_state');
    if (savedState !== state) {
      setError('Invalid state parameter. This may be a CSRF attack.');
      sessionStorage.removeItem('sso_state');
      return;
    }
    sessionStorage.removeItem('sso_state');

    // Store token and validate
    const authenticate = async () => {
      try {
        apiService.setToken(token);

        const response = await apiService.getCurrentUser();
        if (response.success && response.data) {
          router.replace('/chat');
        } else {
          setError('Failed to verify authentication. Please try again.');
          apiService.setToken(null);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication verification failed.');
        apiService.setToken(null);
      }
    };

    authenticate();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
