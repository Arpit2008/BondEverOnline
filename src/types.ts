export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'affiliate' | 'admin';
  isBlocked: boolean;
  referredBy: string | null;
  affiliateStatus: 'none' | 'pending' | 'approved' | 'rejected';
  walletBalance: number;
  totalEarned: number;
  pendingCommission: number;
  payoutDetails: string | null;
  clicks: number;
  createdAt: any;
  updatedAt: any;
  password?: string; // Stored user password for custom override sync
}

export interface ProductDoc {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  commissionPercentage: number;
  downloadLink: string;
  thumbnailUrl: string;
  createdAt: any;
  updatedAt: any;
}

export interface CategoryDoc {
  id: string;
  name: string;
  createdAt: any;
}

export interface OrderDoc {
  id: string;
  userId: string;
  userEmail: string;
  productId: string;
  productTitle: string;
  price: number;
  affiliateId: string | null;
  affiliateCommission: number;
  utr: string;
  screenshotUrl: string; // Base64 or Unsplash/URL
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface PayoutDoc {
  id: string;
  affiliateId: string;
  affiliateEmail: string;
  amount: number;
  status: 'pending' | 'approved' | 'settled' | 'rejected';
  utr: string | null;
  payoutDetails: string;
  createdAt: any;
  updatedAt: any;
}
