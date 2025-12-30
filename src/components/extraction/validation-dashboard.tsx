// src/components/extraction/validation-dashboard.tsx
// Displays validation flags, warnings, and blocking issues

'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ParserValidationDashboard, PreAnalysisGates } from '@/lib/parser';

interface ValidationDashboardProps {
  validationDashboard: ParserValidationDashboard;
  preAnalysisGates: PreAnalysisGates;
}

export function ValidationDashboard({
  validationDashboard,
  preAnalysisGates,
}: ValidationDashboardProps) {
  const getStatusColor = () => {
    switch (validationDashboard.overall_status) {
      case 'blocked':
        return 'bg-red-100 border-red-300';
      case 'warnings':
        return 'bg-yellow-100 border-yellow-300';
      case 'ok':
        return 'bg-green-100 border-green-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusLabel = () => {
    switch (validationDashboard.overall_status) {
      case 'blocked':
        return 'Blocked';
      case 'warnings':
        return 'Warnings';
      case 'ok':
        return 'Ready';
      default:
        return 'Unknown';
    }
  };

  const getReadinessColor = () => {
    switch (preAnalysisGates.readiness_level) {
      case 'BLOCKED':
        return 'text-red-700 bg-red-100';
      case 'READY_LIMITED':
        return 'text-yellow-700 bg-yellow-100';
      case 'READY_FULL':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={`border-2 ${getStatusColor()}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Validation Status</h3>
            <div className="flex items-center gap-2">
              <Badge className={getReadinessColor()}>
                {preAnalysisGates.readiness_level.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-600">
                {preAnalysisGates.can_proceed_to_analysis
                  ? 'Can proceed to analysis'
                  : 'Cannot proceed'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GateIndicator
              label="Unit Scale"
              passed={preAnalysisGates.unit_scale_validated}
              critical
            />
            <GateIndicator
              label="Balance Sheet Balances"
              passed={preAnalysisGates.balance_sheet_balances}
              critical
            />
            <GateIndicator
              label="Consolidation"
              passed={preAnalysisGates.consolidation_gate.analysis_mode !== 'blocked'}
            />
            <GateIndicator
              label="Mapping Quality"
              passed={preAnalysisGates.mapping_gate.high_confidence_pct >= 60}
            />
          </div>
        </CardBody>
      </Card>

      {/* Blocking Issues */}
      {validationDashboard.blocking_issues.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-red-700">
              Blocking Issues ({validationDashboard.blocking_issues.length})
            </h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {validationDashboard.blocking_issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-red-700">{issue}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Warnings */}
      {validationDashboard.warnings.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-yellow-700">
              Warnings ({validationDashboard.warnings.length})
            </h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {validationDashboard.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-yellow-700">{warning}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Substance Warnings */}
      {validationDashboard.substance_warnings.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-orange-700">
              Substance Warnings ({validationDashboard.substance_warnings.length})
            </h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {validationDashboard.substance_warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-orange-700">{warning}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Unit Scale Evidence */}
      {validationDashboard.unit_scale_evidence.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Unit Scale Evidence</h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm text-gray-600">
              {validationDashboard.unit_scale_evidence.map((evidence, index) => (
                <li key={index}>• {evidence}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Required Review Actions */}
      {preAnalysisGates.required_review_actions.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-blue-700">
              Required Review Actions ({preAnalysisGates.required_review_actions.length})
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {preAnalysisGates.required_review_actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          action.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : action.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {action.priority}
                      </Badge>
                      <span className="font-medium">{action.action_type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {action.current_value && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current: <code className="bg-gray-100 px-1 rounded">{action.current_value}</code>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Module Trust Levels */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Module Trust Levels</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <TrustLevelBar
              label="Module A: Balance Sheet & P&L"
              value={preAnalysisGates.module_trust_levels.module_a_anchors}
            />
            <TrustLevelBar
              label="Module B: Notes & IC Context"
              value={preAnalysisGates.module_trust_levels.module_b_context}
            />
            <TrustLevelBar
              label="Module C: Management Report"
              value={preAnalysisGates.module_trust_levels.module_c_narrative}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

interface GateIndicatorProps {
  label: string;
  passed: boolean;
  critical?: boolean;
}

function GateIndicator({ label, passed, critical }: GateIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          passed ? 'bg-green-500' : critical ? 'bg-red-500' : 'bg-yellow-500'
        }`}
      >
        {passed ? (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={`text-sm ${passed ? 'text-gray-700' : critical ? 'text-red-700' : 'text-yellow-700'}`}>
        {label}
        {critical && !passed && <span className="text-xs ml-1">(Critical)</span>}
      </span>
    </div>
  );
}

interface TrustLevelBarProps {
  label: string;
  value: number;
}

function TrustLevelBar({ label, value }: TrustLevelBarProps) {
  const percentage = Math.round(value * 100);
  const getColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
