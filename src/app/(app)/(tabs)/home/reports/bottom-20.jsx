import RankedStocksReportScreen from '@/screens/reports/RankedStocksReportScreen';

export default function Bottom20ReportRoute() {
  return <RankedStocksReportScreen title="Bottom 20" event="GET_STOCK_RANKING_BOTTOM_20" />;
}
