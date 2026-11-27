import RankedStocksReportScreen from '@/screens/reports/RankedStocksReportScreen';

export default function Top20ReportRoute() {
  return <RankedStocksReportScreen title="Top 20" event="GET_STOCK_RANKING_TOP_20" />;
}
