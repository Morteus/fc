// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\utils\formatting.ts

// --- Currency Symbol Mapping ---
export const CURRENCY_SYMBOLS: { [key: string]: string } = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
};

// --- Shared Currency Formatting Function ---
export const formatCurrency = (
  amount: number,
  currencyCode: string = "PHP" // Accept currency code (e.g., "PHP", "USD")
): string => {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode; // Get symbol or fallback to code

  if (isNaN(amount) || !isFinite(amount)) {
    return `${symbol} 0.00`;
  }
  const prefix = amount < 0 ? `-${symbol}` : symbol;
  const formattedAmount = Math.abs(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${prefix}${formattedAmount}`;
};
