export type CurrencyCode = "USD" | "EUR" | "GBP" | "PKR" | "CNY" | "PHP" | "AED" | "AUD" | "CAD";

export type TransactionType =
  | "transfer"
  | "conversion"
  | "card"
  | "deposit"
  | "withdrawal"
  | "fee"
  | "custom"
  | "purchase"
  | "income"
  | "refund";

export type TransactionStatus =
  | "completed"
  | "pending"
  | "failed"
  | "refunded";

export type RecipientType = "personal" | "business";

export type PaymentMethod = "balance" | "card" | "bank";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarInitials: string;
  primaryCurrency: CurrencyCode;
  plan: "Standard" | "Premium";
  createdAt: string;
}

export interface CurrencyBalance {
  currency: CurrencyCode;
  amount: number;
  flag: string;
  name: string;
  accountNumber: string;
  routingOrSort?: string;
  iban?: string;
  bankName: string;
  accountHolder: string;
}

export interface Recipient {
  id: string;
  name: string;
  type: RecipientType;
  email?: string;
  country: string;
  currency: CurrencyCode;
  accountLast4: string;
  bankName: string;
  avatarColor: string;
  initials: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  title: string;
  subtitle: string;
  amount: number;
  currency: CurrencyCode;
  convertedAmount?: number;
  convertedCurrency?: CurrencyCode;
  fee: number;
  feeCurrency: CurrencyCode;
  exchangeRate?: number;
  reference: string;
  date: string;
  merchantOrRecipient: string;
  icon?: string;
  vendorName?: string;
  vendorLogoUrl?: string;
  cardId?: string;
  isCustom?: boolean;
}

export interface TransferDraft {
  recipientId: string | null;
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  sourceAmount: number;
  paymentMethod: PaymentMethod;
  note: string;
}

export interface Transfer {
  id: string;
  recipientId: string;
  sourceAmount: number;
  sourceCurrency: CurrencyCode;
  targetAmount: number;
  targetCurrency: CurrencyCode;
  fee: number;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  reference: string;
  createdAt: string;
  estimatedArrival: string;
}

export interface Conversion {
  id: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fromAmount: number;
  toAmount: number;
  fee: number;
  exchangeRate: number;
  createdAt: string;
}

export interface Card {
  id: string;
  cardholderName: string;
  last4: string;
  fullNumber: string;
  expiry: string;
  cvv: string;
  network: "visa" | "mastercard" | "amex" | "discover";
  frozen: boolean;
  spendingLimit: number;
  spendingUsed: number;
  onlinePayments: boolean;
  contactless: boolean;
  foreignTransactions: boolean;
  nickname?: string;
  color?: string;
  isCustom?: boolean;
}

export interface SecuritySetting {
  passcodeEnabled: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  securityAlerts: boolean;
  devices: LoggedInDevice[];
}

export interface LoggedInDevice {
  id: string;
  name: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface ExchangeRate {
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: number;
  updatedAt: string;
}

export interface RateHistoryPoint {
  date: string;
  rate: number;
}

export interface AppSettings {
  hideBalances: boolean;
  notifications: {
    transfers: boolean;
    rates: boolean;
    security: boolean;
    marketing: boolean;
  };
  appearance: "system" | "light" | "dark";
  primaryCurrency: CurrencyCode;
  rateAlerts: Record<string, boolean>;
}

export interface AuthState {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  hasPasscode: boolean;
}
