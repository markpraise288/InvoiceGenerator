// utils/formatDate.js

const formatDate = (date, locale = "en-US") => {
  if (!date) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

module.exports = formatDate;