-- Source recovery for migration already applied to project gtqovpusfyyvxpeezxlo.
-- This file matches remote ledger version 20261027104702.
-- The view is consumed by the server-side TCE service with service_role.
-- security_invoker ensures the view uses caller permissions/RLS rather than owner privileges.

CREATE OR REPLACE VIEW public.tce_stock_event_market_metrics
WITH (security_invoker = true)
AS
 SELECT se.id,
    se.mongo_id,
    se.symbol,
    se.ex_right_date,
    se.gdkhq_timestamp,
    se.payment_date,
    se.event_content,
    se.ratio_text,
    se.dividend_value,
    se.reference_price,
    se.crawled_at,
    COALESCE(latest.price, latest_ohlcv.close) AS current_price,
    COALESCE(latest.trading_date, latest_ohlcv.trading_date) AS current_price_date,
    history.one_year_low,
    history.one_year_high,
    CASE
      WHEN COALESCE(latest.price, latest_ohlcv.close) > 0::numeric
       AND COALESCE(se.dividend_value, 0::numeric) > 0::numeric
      THEN se.dividend_value / COALESCE(latest.price, latest_ohlcv.close) * 100::numeric
      ELSE NULL::numeric
    END AS dividend_yield_pct
   FROM public.stock_events se
     LEFT JOIN LATERAL (
       SELECT mp.price, mp.trading_date
         FROM public.tce_market_prices mp
        WHERE upper(mp.symbol) = upper(se.symbol)
        ORDER BY mp.trading_date DESC, mp.observed_at DESC
        LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT ohlc.close, ohlc.trading_date
         FROM public.tce_market_ohlcv_daily ohlc
        WHERE upper(ohlc.symbol) = upper(se.symbol)
        ORDER BY ohlc.trading_date DESC
        LIMIT 1
     ) latest_ohlcv ON true
     LEFT JOIN LATERAL (
       SELECT min(ohlc.low) AS one_year_low,
              max(ohlc.high) AS one_year_high
         FROM public.tce_market_ohlcv_daily ohlc
        WHERE upper(ohlc.symbol) = upper(se.symbol)
          AND ohlc.trading_date >= (CURRENT_DATE - '365 days'::interval)::date
          AND ohlc.trading_date <= CURRENT_DATE
     ) history ON true;

REVOKE ALL ON TABLE public.tce_stock_event_market_metrics FROM anon, authenticated;
GRANT SELECT ON TABLE public.tce_stock_event_market_metrics TO service_role;
