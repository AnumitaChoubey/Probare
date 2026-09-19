import {
  LayoutDashboard,
  CheckSquare,
  FileSpreadsheet,
  PlusCircle,
  MessageSquareWarning,
  Paperclip,
  GitFork,
  CheckCircle2,
  Scale,
  LineChart,
  FileText,
  Settings,
} from 'lucide-react';
import { UserRole, NavSection } from '../../context/QEMSContext';

export interface NavItemDef {
  id: NavSection;
  label: string;
  icon: any;
  badgeType?: 'alerts' | 'tasks' | 'total' | 'rebuttals' | 'capas' | 'calibrations';
  badgeColor?: string;
}

export const useRoleNavigation = (role: UserRole): NavItemDef[] => {
  const allItems: Record<string, NavItemDef> = {
    command: { id: 'COMMAND CENTER', label: 'Command Center', icon: LayoutDashboard, badgeType: 'alerts', badgeColor: 'bg-rose-100 text-rose-700' },
    myWork: { id: 'MY WORK', label: 'My Work', icon: CheckSquare, badgeType: 'tasks', badgeColor: 'bg-indigo-100 text-indigo-700' },
    events: { id: 'QUALITY EVENTS', label: 'Quality Events', icon: FileSpreadsheet, badgeType: 'total', badgeColor: 'bg-slate-100 text-slate-700 font-mono' },
    newError: { id: 'NEW ERROR', label: 'New Error Entry', icon: PlusCircle },
    disputes: { id: 'DISPUTE CENTER', label: 'Dispute Center', icon: MessageSquareWarning, badgeType: 'rebuttals', badgeColor: 'bg-amber-100 text-amber-800 font-semibold' },
    evidence: { id: 'EVIDENCE', label: 'Evidence Gallery', icon: Paperclip },
    rca: { id: 'ROOT CAUSE', label: 'Root Cause (RCA)', icon: GitFork },
    capa: { id: 'CORRECTIVE ACTIONS', label: 'Corrective Actions', icon: CheckCircle2, badgeType: 'capas', badgeColor: 'bg-cyan-100 text-cyan-800' },
    calibration: { id: 'CALIBRATION', label: 'Calibration Center', icon: Scale, badgeType: 'calibrations', badgeColor: 'bg-violet-100 text-violet-800' },
    intelligence: { id: 'QUALITY INTELLIGENCE', label: 'Quality Intelligence', icon: LineChart },
    reports: { id: 'REPORTS', label: 'Reports & Audits', icon: FileText },
    admin: { id: 'ADMINISTRATION', label: 'Administration', icon: Settings },
  };

  switch (role) {
    case 'Frontline Employee':
      return [
        allItems.myWork,
        allItems.events,
        allItems.disputes,
        allItems.evidence,
      ];
    case 'QA Auditor':
      return [
        allItems.myWork,
        allItems.events,
        allItems.newError,
        allItems.disputes,
        allItems.evidence,
        allItems.rca,
        allItems.calibration,
      ];
    case 'Team Lead':
      return [
        allItems.command,
        allItems.myWork,
        allItems.events,
        allItems.disputes,
        allItems.capa,
        allItems.intelligence,
      ];
    case 'QA Manager':
    case 'QA Reviewer':
      return [
        allItems.command,
        allItems.myWork,
        allItems.events,
        allItems.newError,
        allItems.disputes,
        allItems.rca,
        allItems.capa,
        allItems.calibration,
        allItems.intelligence,
        allItems.reports,
      ];
    case 'Quality Governance':
      return [
        allItems.command,
        allItems.events,
        allItems.capa,
        allItems.calibration,
        allItems.intelligence,
        allItems.reports,
      ];
    case 'Executive / Leadership':
      return [
        allItems.command,
        allItems.intelligence,
        allItems.reports,
      ];
    case 'System Administrator':
    case 'Administrator':
      return Object.values(allItems);
    default:
      return [allItems.myWork, allItems.events];
  }
};
