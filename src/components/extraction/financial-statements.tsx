// src/components/extraction/financial-statements.tsx
// Displays extracted balance sheet and P&L line items

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ParserCanonicalLineItem } from '@/lib/parser';

interface FinancialStatementsProps {
  balanceSheet: {
    total_assets: number | null;
    total_liabilities: number | null;
    line_items: ParserCanonicalLineItem[];
  };
  profitLoss: {
    net_profit_loss: number | null;
    line_items: ParserCanonicalLineItem[];
  };
  unitScale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
}

export function FinancialStatements({
  balanceSheet,
  profitLoss,
  unitScale,
}: FinancialStatementsProps) {
  const [activeTab, setActiveTab] = useState<'balance_sheet' | 'profit_loss'>('balance_sheet');
  const [showLowConfidence, setShowLowConfidence] = useState(true);

  const getUnitLabel = () => {
    switch (unitScale) {
      case 'MILLIONS':
        return 'Millions EUR';
      case 'THOUSANDS':
        return 'Thousands EUR';
      default:
        return 'EUR';
    }
  };

  const filterItems = (items: ParserCanonicalLineItem[]) => {
    if (showLowConfidence) return items;
    return items.filter((item) => item.extraction_confidence >= 0.7);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'balance_sheet'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Balance Sheet ({balanceSheet.line_items.length} items)
        </button>
        <button
          onClick={() => setActiveTab('profit_loss')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'profit_loss'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Profit & Loss ({profitLoss.line_items.length} items)
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Unit: <span className="font-medium">{getUnitLabel()}</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showLowConfidence}
            onChange={(e) => setShowLowConfidence(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show low confidence items
        </label>
      </div>

      {/* Balance Sheet */}
      {activeTab === 'balance_sheet' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Balance Sheet</h3>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Assets:</span>{' '}
                  <span className="font-semibold">
                    {formatValue(balanceSheet.total_assets, unitScale)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total Liabilities:</span>{' '}
                  <span className="font-semibold">
                    {formatValue(balanceSheet.total_liabilities, unitScale)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <LineItemsTable
              items={filterItems(balanceSheet.line_items)}
              unitScale={unitScale}
            />
          </CardBody>
        </Card>
      )}

      {/* Profit & Loss */}
      {activeTab === 'profit_loss' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Profit & Loss</h3>
              <div className="text-sm">
                <span className="text-gray-500">Net Profit/Loss:</span>{' '}
                <span
                  className={`font-semibold ${
                    profitLoss.net_profit_loss !== null && profitLoss.net_profit_loss < 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {formatValue(profitLoss.net_profit_loss, unitScale)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <LineItemsTable
              items={filterItems(profitLoss.line_items)}
              unitScale={unitScale}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface LineItemsTableProps {
  items: ParserCanonicalLineItem[];
  unitScale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
}

function LineItemsTable({ items, unitScale }: LineItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No line items extracted
      </div>
    );
  }

  // Group items by code prefix (first 2 digits)
  const groupedItems = items.reduce((acc, item) => {
    const prefix = item.ecdf_code.substring(0, 2);
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(item);
    return acc;
  }, {} as Record<string, ParserCanonicalLineItem[]>);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Year
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prior Year
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Confidence
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              TP Priority
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item, index) => (
            <LineItemRow key={`${item.ecdf_code}-${index}`} item={item} unitScale={unitScale} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface LineItemRowProps {
  item: ParserCanonicalLineItem;
  unitScale: 'UNITS' | 'THOUSANDS' | 'MILLIONS';
}

function LineItemRow({ item, unitScale }: LineItemRowProps) {
  const getConfidenceColor = () => {
    if (item.extraction_confidence >= 0.8) return 'bg-green-100 text-green-700';
    if (item.extraction_confidence >= 0.5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getPriorityColor = () => {
    switch (item.tp_priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <tr className={item.is_total ? 'bg-blue-50 font-medium' : ''}>
      <td className="px-4 py-2 whitespace-nowrap">
        <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{item.ecdf_code}</code>
      </td>
      <td className="px-4 py-2">
        <div className="text-sm text-gray-900">{item.caption_normalized}</div>
        {item.caption_original !== item.caption_normalized && (
          <div className="text-xs text-gray-500">{item.caption_original}</div>
        )}
        {item.note_reference && (
          <span className="text-xs text-blue-600 ml-1">[Note {item.note_reference}]</span>
        )}
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <span
          className={`text-sm ${
            item.value_current_year !== null && item.value_current_year < 0
              ? 'text-red-600'
              : 'text-gray-900'
          }`}
        >
          {formatValue(item.value_current_year, unitScale)}
        </span>
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap text-sm text-gray-500">
        {formatValue(item.value_prior_year, unitScale)}
      </td>
      <td className="px-4 py-2 text-center">
        <Badge className={`text-xs ${getConfidenceColor()}`}>
          {(item.extraction_confidence * 100).toFixed(0)}%
        </Badge>
      </td>
      <td className="px-4 py-2 text-center">
        <Badge className={`text-xs ${getPriorityColor()}`}>{item.tp_priority}</Badge>
      </td>
    </tr>
  );
}

function formatValue(
  value: number | null,
  unitScale: 'UNITS' | 'THOUSANDS' | 'MILLIONS'
): string {
  if (value === null) return '-';

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: unitScale === 'UNITS' ? 0 : 1,
  });

  return formatter.format(value);
}
