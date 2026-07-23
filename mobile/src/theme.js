export const colors = {
  paper: '#fafafa',
  surface: '#ffffff',
  ink: '#000000',
  muted: '#666666',
  line: '#e4e4e4',
  navy: '#002368',
  navySoft: '#e8ecf5',
  red: '#bc0000',
  redSoft: '#f9e6e6',
  verifyBlue: '#1D9BF0',
};

export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

let displayCurrency = 'ZMW';
const USD_RATE = 18; // 1 USD ≈ 18 ZMW (display approximation only)

export const setDisplayCurrency = (cur) => {
  displayCurrency = cur === 'USD' ? 'USD' : 'ZMW';
};

export const money = (amount, currency = 'ZMW') => {
  if (displayCurrency === 'USD' && currency === 'ZMW') {
    return '$' + (Number(amount || 0) / USD_RATE).toFixed(2);
  }
  return 'K' + Number(amount || 0).toLocaleString();
};
