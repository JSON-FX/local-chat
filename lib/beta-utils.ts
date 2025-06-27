export interface BetaStatus {
  isBeta: boolean;
  version: string;
  lastDataReset?: string;
  nextResetWarning?: string;
  userAcceptedTerms: boolean;
  termsAcceptedDate?: string;
}

export class BetaManager {
  private static readonly BETA_VERSION = '1.0.0-beta';
  private static readonly STORAGE_KEY = 'lgu-chat-beta-status';
  private static readonly AGREEMENT_KEY = 'beta-agreement-accepted';
  private static readonly AGREEMENT_DATE_KEY = 'beta-agreement-date';
  private static readonly NOTICE_DISMISSED_KEY = 'beta-notice-dismissed';

  /**
   * Check if the application is running in beta mode
   */
  static isBetaMode(): boolean {
    return true; // Always beta during development
  }

  /**
   * Get current beta status
   */
  static getBetaStatus(): BetaStatus {
    if (typeof window === 'undefined') {
      return {
        isBeta: true,
        version: this.BETA_VERSION,
        userAcceptedTerms: false
      };
    }

    const hasAcceptedTerms = localStorage.getItem(this.AGREEMENT_KEY) === 'true';
    const termsAcceptedDate = localStorage.getItem(this.AGREEMENT_DATE_KEY);

    return {
      isBeta: this.isBetaMode(),
      version: this.BETA_VERSION,
      userAcceptedTerms: hasAcceptedTerms,
      termsAcceptedDate: termsAcceptedDate || undefined,
      lastDataReset: this.getLastDataReset(),
      nextResetWarning: this.getNextResetWarning()
    };
  }

  /**
   * Check if user has accepted beta terms
   */
  static hasUserAcceptedTerms(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.AGREEMENT_KEY) === 'true';
  }

  /**
   * Mark that user has accepted beta terms
   */
  static acceptBetaTerms(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.AGREEMENT_KEY, 'true');
    localStorage.setItem(this.AGREEMENT_DATE_KEY, new Date().toISOString());
  }

  /**
   * Check if user has dismissed the beta notice
   */
  static hasUserDismissedNotice(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.NOTICE_DISMISSED_KEY) === 'true';
  }

  /**
   * Mark that user has dismissed the beta notice
   */
  static dismissBetaNotice(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.NOTICE_DISMISSED_KEY, 'true');
  }

  /**
   * Reset beta notice visibility (for major updates)
   */
  static resetBetaNotice(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.NOTICE_DISMISSED_KEY);
  }

  /**
   * Get formatted beta warning message
   */
  static getBetaWarningMessage(): string {
    return 'This is a beta version of LGU-Chat. Your messages, files, and account data may be removed during major updates. Please backup important information regularly.';
  }

  /**
   * Get data backup recommendations
   */
  static getBackupRecommendations(): string[] {
    return [
      'Export important conversations as screenshots or text files',
      'Download uploaded files to your local device',
      'Keep a separate record of important contact information',
      'Do not store critical business data solely in this beta application',
      'Regularly check for update announcements from administrators'
    ];
  }

  /**
   * Check if it's time to show a data backup reminder
   */
  static shouldShowBackupReminder(): boolean {
    if (typeof window === 'undefined') return false;
    
    const lastReminder = localStorage.getItem('beta-backup-reminder');
    if (!lastReminder) return true;
    
    const lastReminderDate = new Date(lastReminder);
    const daysSinceReminder = (Date.now() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceReminder >= 7; // Show weekly reminders
  }

  /**
   * Mark that backup reminder was shown
   */
  static markBackupReminderShown(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('beta-backup-reminder', new Date().toISOString());
  }

  /**
   * Get version-specific warnings for admins
   */
  static getAdminWarnings(): string[] {
    return [
      'Beta data may be cleared during updates - inform users accordingly',
      'Test all critical features before major releases',
      'Monitor system performance and user feedback closely',
      'Prepare data migration strategies for production deployment',
      'Keep regular database backups during beta testing'
    ];
  }

  /**
   * Clear all beta-related data (for fresh starts)
   */
  static clearBetaData(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.AGREEMENT_KEY);
    localStorage.removeItem(this.AGREEMENT_DATE_KEY);
    localStorage.removeItem(this.NOTICE_DISMISSED_KEY);
    localStorage.removeItem('beta-backup-reminder');
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Generate a summary for admin dashboard
   */
  static getBetaSummary(): {
    version: string;
    activeUsers: number;
    dataResetDate?: string;
    warningsIssued: number;
  } {
    return {
      version: this.BETA_VERSION,
      activeUsers: 0, // Would be populated from API
      dataResetDate: this.getLastDataReset(),
      warningsIssued: 0 // Would be tracked in analytics
    };
  }

  private static getLastDataReset(): string | undefined {
    // This would typically come from the backend
    return undefined;
  }

  private static getNextResetWarning(): string | undefined {
    // This would typically come from admin announcements
    return undefined;
  }
} 