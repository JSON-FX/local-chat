'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileX, MessageSquareOff, Shield } from 'lucide-react';

interface BetaAgreementDialogProps {
  onAgreementAccepted: () => void;
}

export function BetaAgreementDialog({ onAgreementAccepted }: BetaAgreementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);

  useEffect(() => {
    // Check if user has already agreed to beta terms
    const hasAcceptedBeta = localStorage.getItem('beta-agreement-accepted');
    if (!hasAcceptedBeta) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    if (hasAgreed && hasReadTerms) {
      localStorage.setItem('beta-agreement-accepted', 'true');
      localStorage.setItem('beta-agreement-date', new Date().toISOString());
      setIsOpen(false);
      onAgreementAccepted();
    }
  };

  const handleDecline = () => {
    // Redirect to a goodbye page or close the app
    window.location.href = '/';
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              BETA
            </Badge>
            Beta Testing Agreement
          </DialogTitle>
          <DialogDescription>
            Welcome to LGU-Chat Beta! Please read and accept the following terms before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Important Beta Notice
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  This is a beta version of LGU-Chat. During testing and major updates, we may need to:
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <MessageSquareOff className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Remove all messages and conversations</p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">Chat history may be permanently deleted</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <FileX className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Delete uploaded files and media</p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">All shared files may be permanently lost</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <Shield className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Reset user accounts and settings</p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">Profile settings and preferences may be lost</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Recommendation:</strong> Please backup any important conversations or files regularly. 
              Do not store critical information solely in this beta application.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={hasReadTerms}
                onCheckedChange={(checked) => setHasReadTerms(checked as boolean)}
              />
              <label 
                htmlFor="terms" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and understand the beta testing conditions
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement" 
                checked={hasAgreed}
                onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
              />
              <label 
                htmlFor="agreement" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I accept the risk of potential data loss and agree to participate in beta testing
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!hasAgreed || !hasReadTerms}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 