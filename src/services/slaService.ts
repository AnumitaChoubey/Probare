import { SLAStatus } from '../types';

export interface SLACalculation {
  hoursRemaining: number;
  status: SLAStatus;
  isBreached: boolean;
  isWarning: boolean;
  isAtRisk: boolean;
  formattedRemaining: string;
}

/**
 * Calculates current SLA status given an ISO date string or timestamp.
 * Warning thresholds:
 * - > 12h: On Track
 * - 4h - 12h: Warning
 * - 0h - 4h: At Risk
 * - < 0h: Breached
 */
export function calculateSLA(dueDateIso: string, now: Date = new Date()): SLACalculation {
  if (!dueDateIso) {
    return {
      hoursRemaining: 0,
      status: 'On Track',
      isBreached: false,
      isWarning: false,
      isAtRisk: false,
      formattedRemaining: 'No SLA',
    };
  }

  const dueTime = new Date(dueDateIso).getTime();
  if (isNaN(dueTime)) {
    return {
      hoursRemaining: 0,
      status: 'On Track',
      isBreached: false,
      isWarning: false,
      isAtRisk: false,
      formattedRemaining: 'Invalid Date',
    };
  }

  const diffMs = dueTime - now.getTime();
  const hoursRemaining = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

  if (hoursRemaining < 0) {
    const overdueHours = Math.abs(hoursRemaining);
    return {
      hoursRemaining,
      status: 'Breached',
      isBreached: true,
      isWarning: false,
      isAtRisk: false,
      formattedRemaining: `${overdueHours > 24 ? Math.floor(overdueHours / 24) + 'd ' : ''}${Math.round(overdueHours % 24)}h overdue`,
    };
  }

  if (hoursRemaining <= 4) {
    return {
      hoursRemaining,
      status: 'At Risk',
      isBreached: false,
      isWarning: false,
      isAtRisk: true,
      formattedRemaining: `${hoursRemaining}h remaining`,
    };
  }

  if (hoursRemaining <= 12) {
    return {
      hoursRemaining,
      status: 'Warning',
      isBreached: false,
      isWarning: true,
      isAtRisk: false,
      formattedRemaining: `${hoursRemaining}h remaining`,
    };
  }

  return {
    hoursRemaining,
    status: 'On Track',
    isBreached: false,
    isWarning: false,
    isAtRisk: false,
    formattedRemaining: `${hoursRemaining > 24 ? Math.floor(hoursRemaining / 24) + 'd ' : ''}${Math.round(hoursRemaining % 24)}h`,
  };
}
