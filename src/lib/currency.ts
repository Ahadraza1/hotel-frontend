export const currencyConfig = {
  INR: {
    symbol: "₹",
    locale: "en-IN",
  },
} as const;

export type SupportedCurrency = keyof typeof currencyConfig;

export const DEFAULT_CURRENCY: SupportedCurrency = "INR";

export const normalizeCurrency = (
  currency?: string | null,
): SupportedCurrency => {
  if (!currency) return DEFAULT_CURRENCY;

  const normalized = currency.trim().toUpperCase() as SupportedCurrency;

  return normalized in currencyConfig ? normalized : DEFAULT_CURRENCY;
};

const parseAmount = (amount: number | string | null | undefined) => {
  const parsed = Number.parseFloat(String(amount ?? 0));

  return Number.isFinite(parsed) ? parsed : 0;
};

export const getCurrencySymbol = (currency?: string | null) =>
  currencyConfig[normalizeCurrency(currency)].symbol;

export const formatCurrency = (
  amount: number | string | null | undefined,
  currency = DEFAULT_CURRENCY,
) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const config = currencyConfig[normalizedCurrency];

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseAmount(amount));
};

export const formatCompactCurrency = (
  amount: number | string | null | undefined,
  currency = DEFAULT_CURRENCY,
) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const config = currencyConfig[normalizedCurrency];

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: normalizedCurrency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(parseAmount(amount));
};
