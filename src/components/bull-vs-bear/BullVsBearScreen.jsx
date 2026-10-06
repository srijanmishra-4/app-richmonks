import { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import { RMLoader } from '@/components/RMLoader/RMLoader';
import { connectSocket } from '@/utils/socket';
import { useSocketEvent } from '@/hooks/useSocket';

// ─── Design tokens ──────────────────────────────────────────────────────────────

const GREEN_TEXT = '#15803D';
const RED_TEXT = '#B91C1C';
const ACCENT = '#0071A9';

// Column labels displayed to the user
const COLUMNS = [
  { key: 'lastdatatime', label: 'Time' },
  { key: 'abv_wap',      label: 'Abv WAP' },
  { key: 'abv_high',     label: 'Above Prev.\nDay High' },
  { key: 'below_low',    label: 'Below Prev.\nDay Low' },
  { key: 'pl1D',         label: 'Profit\nMeter' },
];

// Column flex weights — Time narrowest, Profit Meter wider for values like 4,29,017
const COL_FLEX = [0.72, 0.78, 1, 1, 1.2];

// ─── Number formatting (Indian comma grouping, reused from project conventions) ─

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function formatValue(val) {
  if (val == null || val === '') return '—';
  const str = String(val).trim().replace(/,/g, '');
  if (!str) return '—';
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return str;
  const abs = Math.abs(Math.round(num));
  const formatted = groupDigits(String(abs));
  return num < 0 ? `-${formatted}` : formatted;
}

// ─── Color resolution ───────────────────────────────────────────────────────────

function colorName(color) {
  return String(color ?? '').replace(/^bg-/, '');
}

function resolveCellTextColor(color) {
  const name = colorName(color);
  if (name === 'green') return GREEN_TEXT;
  if (name === 'red') return RED_TEXT;
  return '#0F172A';
}

function reportRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.data)) return result.data;
  if (result.lastdatatime != null || result.abv_wap != null || result.pl1D != null) return [result];
  return [];
}

// ─── Component ──────────────────────────────────────────────────────────────────

function BullVsBearScreen() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Emit request on mount
  useEffect(() => {
    try {
      const client = connectSocket();
      client.emit('GET_APP_BULL_VS_BEAR_REPORT');
    } catch (err) {
      console.log('[BullVsBear] Emit error:', err?.message);
      setError(true);
      setLoading(false);
    }
  }, []);

  // Listen for response
  useSocketEvent('REC_APP_BULL_VS_BEAR_REPORT', useCallback((result, err) => {
    if (err) {
      console.log('[BullVsBear] Socket error:', err?.message);
      setError(true);
      setLoading(false);
      return;
    }
    if (result) {
      console.log('[SOCKET] REC_APP_BULL_VS_BEAR_REPORT', result);
      setReport(result);
      setError(false);
    }
    setLoading(false);
  }, []));

  const data = reportRows(report);
  const cdate = report?.cdate ?? '';
  const expiryDate = report?.expiry_date ?? '';
  const hasMeta = Boolean(cdate || expiryDate);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader label="Bulls Vs Bears" />

      {loading ? (
        <View style={styles.loader}><RMLoader /></View>
      ) : error || data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {error ? 'Failed to load report. Please try again.' : 'No data available.'}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {hasMeta ? (
            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <Text style={styles.metaLabel}>Expiry Date</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaValue}>{expiryDate || '—'}</Text>
              </View>
              {cdate ? <Text style={styles.metaDate}>{cdate}</Text> : null}
            </View>
          ) : null}

          {/* Table header */}
          <View style={styles.tableHeader}>
            {COLUMNS.map((col, i) => (
              <View key={col.key} style={[styles.thCell, { flex: COL_FLEX[i] }]}>
                <Text style={styles.thText}>{col.label}</Text>
              </View>
            ))}
          </View>

          {/* Separator */}
          <View style={styles.headerSep} />

          {/* Table body */}
          <ScrollView
            style={styles.tableScroll}
            contentContainerStyle={styles.tableScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {data.map((row, index) => (
              <TableRow key={`${row.lastdatatime}-${index}`} row={row} index={index} />
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Table Row ──────────────────────────────────────────────────────────────────

const TableRow = memo(function TableRow({ row, index }) {
  const isEOD = row.lastdatatime === 'EOD';
  const timeDisplay = row.lastdatatime ?? '—';

  const fields = ['abv_wap', 'abv_high', 'below_low', 'pl1D'];

  return (
    <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd, isEOD ? styles.rowEOD : null]}>
      {/* Time cell */}
      <View style={[styles.tdCell, { flex: COL_FLEX[0] }]}>
        <Text style={[styles.tdTimeText, isEOD ? styles.tdTimeEOD : null]} numberOfLines={1}>
          {timeDisplay}
        </Text>
      </View>

      {/* Data cells */}
      {fields.map((field, i) => {
        const cellData = row[field];
        const value = cellData?.value;
        const color = cellData?.color;
        const textColor = resolveCellTextColor(color);
        const isColored = colorName(color) === 'green' || colorName(color) === 'red';
        const isProfitMeter = field === 'pl1D';

        return (
          <View key={field} style={[styles.tdCell, { flex: COL_FLEX[i + 1] }]}>
            <View style={styles.valueChip}>
              <Text
                style={[
                  styles.tdValueText,
                  isColored ? { color: textColor } : null,
                  isProfitMeter ? styles.tdProfitText : null,
                ]}
                numberOfLines={1}
              >
                {formatValue(value)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

export default memo(BullVsBearScreen);

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },

  // ─── Metadata strip ───────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
  },
  metaValue: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  metaDate: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
  },

  // ─── Table header ─────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  thCell: {
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  thText: {
    fontSize: 9.5,
    lineHeight: 13,
    fontFamily: 'Inter_500Medium',
    color: '#94A3B8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  headerSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },

  // ─── Scrollable body ──────────────────────────────────────────────────────
  tableScroll: {
    flex: 1,
    minHeight: 0,
  },
  tableScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },

  // ─── Rows ──────────────────────────────────────────────────────────────────
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
  },
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  rowOdd: {
    backgroundColor: '#FAFBFC',
  },
  rowEOD: {
    backgroundColor: '#F0F7FF',
  },

  // ─── Cells ─────────────────────────────────────────────────────────────────
  tdCell: {
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tdTimeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
  },
  tdTimeEOD: {
    fontFamily: 'Inter_600SemiBold',
    color: ACCENT,
  },
  valueChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tdValueText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#0F172A',
    textAlign: 'center',
  },
  tdProfitText: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
  },
});
