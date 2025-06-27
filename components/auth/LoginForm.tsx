'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiService } from '@/lib/api';
import Image from 'next/image';
import { BetaNotice } from '@/components/ui/beta-notice';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isRegisterMode && !formData.confirmPassword) {
      toast.error('Please confirm your password');
      return;
    }

    setIsLoading(true);

    try {
      let response;
      
      if (isRegisterMode) {
        response = await apiService.register(formData.username, formData.password, formData.confirmPassword);
        if (response.success && response.data) {
          toast.success('Registration successful!');
        }
      } else {
        response = await apiService.login(formData.username, formData.password);
        if (response.success && response.data) {
          toast.success('Login successful!');
        }
      }
      
      if (response.success && response.data) {
        // Socket connection will be handled by ChatLayout
        
        // Call success callback or redirect
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          router.push('/chat');
        }
      } else {
        toast.error(response.error || `${isRegisterMode ? 'Registration' : 'Login'} failed`);
      }
    } catch (error) {
      console.error(`${isRegisterMode ? 'Registration' : 'Login'} error:`, error);
      toast.error('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
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
            {isRegisterMode 
              ? 'Create a new account to start messaging' 
              : 'Sign in to your account to start messaging'
            }
            {isRegisterMode && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Beta Notice:</strong> This is a beta version. Your data may be removed during updates.
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange('username')}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                required
              />
            </div>
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  disabled={isLoading}
                  required
                />
              </div>
            )}
                        <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegisterMode ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setFormData({ username: '', password: '', confirmPassword: '' });
              }}
              disabled={isLoading}
            >
              {isRegisterMode 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Register"
              }
            </Button>
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo account: admin / admin123</p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
} 