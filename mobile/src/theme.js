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

export const money = (amount, currency = 'ZMW') =>
  `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
