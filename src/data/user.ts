import type {
  Card,
  CurrencyBalance,
  Recipient,
  SecuritySetting,
  User,
} from "@/types";

/** Starting balance for every new account (USD). */
export const STARTING_BALANCE_USD = 5500;

export const DEFAULT_USER: User = {
  id: "user_001",
  firstName: "Raza",
  lastName: "Abbas Zaidi",
  email: "raza@wise.com",
  phone: "+1 (555) 014-2890",
  avatarInitials: "RZ",
  primaryCurrency: "USD",
  plan: "Standard",
  createdAt: "2024-03-12T10:00:00.000Z",
};

export const INITIAL_BALANCES: CurrencyBalance[] = [
  {
    currency: "USD",
    amount: STARTING_BALANCE_USD,
    flag: "🇺🇸",
    name: "US dollar",
    accountNumber: "****4821",
    routingOrSort: "026009593",
    bankName: "Community Federal Savings Bank",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "EUR",
    amount: 0,
    flag: "🇪🇺",
    name: "Euro",
    accountNumber: "****9012",
    iban: "BE94 8974 2345 6789",
    bankName: "Wise Europe SA",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "GBP",
    amount: 0,
    flag: "🇬🇧",
    name: "British pound",
    accountNumber: "****3340",
    routingOrSort: "23-14-70",
    iban: "GB29 NWBK 6016 1331 9268 19",
    bankName: "Wise Payments Limited",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "PKR",
    amount: 0,
    flag: "🇵🇰",
    name: "Pakistani rupee",
    accountNumber: "****7721",
    bankName: "Partner Bank PK",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "CNY",
    amount: 0,
    flag: "🇨🇳",
    name: "Chinese yuan",
    accountNumber: "****5590",
    bankName: "Partner Bank CN",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "AED",
    amount: 0,
    flag: "🇦🇪",
    name: "UAE dirham",
    accountNumber: "****2201",
    bankName: "Partner Bank AE",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "AUD",
    amount: 0,
    flag: "🇦🇺",
    name: "Australian dollar",
    accountNumber: "****8810",
    bankName: "Partner Bank AU",
    accountHolder: "Raza Abbas Zaidi",
  },
  {
    currency: "CAD",
    amount: 0,
    flag: "🇨🇦",
    name: "Canadian dollar",
    accountNumber: "****4412",
    bankName: "Partner Bank CA",
    accountHolder: "Raza Abbas Zaidi",
  },
];

export const INITIAL_RECIPIENTS: Recipient[] = [
  {
    id: "rec_001",
    name: "Sara Ahmed",
    type: "personal",
    email: "sara.ahmed@email.com",
    country: "Pakistan",
    currency: "PKR",
    accountLast4: "4412",
    bankName: "HBL",
    avatarColor: "#A0E1E1",
    initials: "SA",
  },
  {
    id: "rec_002",
    name: "James Wilson",
    type: "personal",
    email: "james.w@email.com",
    country: "United Kingdom",
    currency: "GBP",
    accountLast4: "8821",
    bankName: "Barclays",
    avatarColor: "#C5EDAB",
    initials: "JW",
  },
  {
    id: "rec_003",
    name: "Marie Dupont",
    type: "personal",
    email: "marie.d@email.com",
    country: "France",
    currency: "EUR",
    accountLast4: "2290",
    bankName: "BNP Paribas",
    avatarColor: "#9FE870",
    initials: "MD",
  },
];

export const INITIAL_CARD: Card = {
  id: "card_001",
  cardholderName: "RAZA ABBAS ZAIDI",
  last4: "4242",
  fullNumber: "4532123456784242",
  expiry: "09/28",
  cvv: "847",
  network: "visa",
  frozen: false,
  spendingLimit: 5000,
  spendingUsed: 1240.5,
  onlinePayments: true,
  contactless: true,
  foreignTransactions: true,
  nickname: "Everyday",
  color: "#163300",
  isCustom: false,
};

export const INITIAL_CARDS: Card[] = [INITIAL_CARD];

export const INITIAL_SECURITY: SecuritySetting = {
  passcodeEnabled: true,
  biometricEnabled: true,
  twoFactorEnabled: false,
  securityAlerts: true,
  devices: [
    {
      id: "dev_001",
      name: "iPhone 15 Pro",
      location: "Karachi, PK",
      lastActive: "2026-07-20T08:30:00.000Z",
      current: true,
    },
    {
      id: "dev_002",
      name: "MacBook Pro",
      location: "Karachi, PK",
      lastActive: "2026-07-19T21:10:00.000Z",
      current: false,
    },
  ],
};
