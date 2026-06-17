// utils/formatCurrency.js

const formatCurrency = (
  amount,
  currency = "USD",
  locale = "en-US"
) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount || 0);
  } catch {
    return `${currency} ${amount}`;
  }
};

module.exports = formatCurrency;