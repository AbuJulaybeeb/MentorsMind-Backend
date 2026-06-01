import pool from "../config/database";

export interface LoyaltyToken {
  symbol: string;
  totalSupply: string;
  circulatingSupply: string;
  holders: number;
  price: string;
}

export interface LoyaltyAccount {
  userId: string;
  balance: string;
  earned: string;
  redeemed: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  benefits: string[];
}

export interface EarnRule {
  action: string;
  tokensEarned: string;
  cooldown?: number;
  maxPerDay?: string;
}

const TIER_THRESHOLDS = { bronze: 0, silver: 100, gold: 500, platinum: 2000 };
const TIER_BENEFITS: Record<string, string[]> = {
  bronze: ["5% session discount"],
  silver: ["10% session discount", "Priority support"],
  gold: ["15% session discount", "Priority support", "Free session monthly"],
  platinum: [
    "20% session discount",
    "Priority support",
    "2 free sessions monthly",
    "Exclusive mentors",
  ],
};

const EARN_RULES: EarnRule[] = [
  { action: "complete_session", tokensEarned: "10", cooldown: 0 },
  { action: "write_review", tokensEarned: "5", maxPerDay: "15" },
  { action: "referral", tokensEarned: "50" },
  { action: "daily_login", tokensEarned: "1", maxPerDay: "1" },
];

function computeTier(
  balance: number,
): "bronze" | "silver" | "gold" | "platinum" {
  if (balance >= TIER_THRESHOLDS.platinum) return "platinum";
  if (balance >= TIER_THRESHOLDS.gold) return "gold";
  if (balance >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

export const LoyaltyService = {
  async getOrCreateAccount(userId: string): Promise<LoyaltyAccount> {
    const { rows } = await pool.query(
      "SELECT * FROM loyalty_accounts WHERE user_id=$1",
      [userId],
    );
    if (rows[0]) {
      const row = rows[0];
      const tier = computeTier(parseFloat(row.balance));
      return {
        userId,
        balance: row.balance,
        earned: row.earned,
        redeemed: row.redeemed,
        tier,
        benefits: TIER_BENEFITS[tier],
      };
    }
    await pool.query(
      "INSERT INTO loyalty_accounts (user_id, balance, earned, redeemed) VALUES ($1, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING",
      [userId],
    );
    return {
      userId,
      balance: "0",
      earned: "0",
      redeemed: "0",
      tier: "bronze",
      benefits: TIER_BENEFITS.bronze,
    };
  },

  async earnTokens(userId: string, action: string): Promise<LoyaltyAccount> {
    const rule = EARN_RULES.find((r) => r.action === action);
    if (!rule) throw new Error(`Unknown earn action: ${action}`);

    const tokens = parseFloat(rule.tokensEarned);
    await pool.query(
      `INSERT INTO loyalty_accounts (user_id, balance, earned, redeemed)
       VALUES ($1, $2, $2, 0)
       ON CONFLICT (user_id) DO UPDATE
       SET balance = loyalty_accounts.balance + $2,
           earned = loyalty_accounts.earned + $2,
           updated_at = CURRENT_TIMESTAMP`,
      [userId, tokens],
    );
    await pool.query(
      "INSERT INTO loyalty_transactions (user_id, action, tokens, type) VALUES ($1,$2,$3,'earn')",
      [userId, action, tokens],
    );
    return this.getOrCreateAccount(userId);
  },

  async redeemTokens(userId: string, tokens: number): Promise<LoyaltyAccount> {
    const account = await this.getOrCreateAccount(userId);
    if (parseFloat(account.balance) < tokens)
      throw new Error("Insufficient token balance");

    await pool.query(
      `UPDATE loyalty_accounts SET balance = balance - $2, redeemed = redeemed + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id=$1`,
      [userId, tokens],
    );
    await pool.query(
      "INSERT INTO loyalty_transactions (user_id, action, tokens, type) VALUES ($1,'redeem',$2,'redeem')",
      [userId, tokens],
    );
    return this.getOrCreateAccount(userId);
  },

  async getTokenInfo(): Promise<LoyaltyToken> {
    const { rows } = await pool.query(
      "SELECT COALESCE(SUM(earned),0) as circulating, COUNT(DISTINCT user_id) as holders FROM loyalty_accounts",
    );
    return {
      symbol: "MMLP",
      totalSupply: "10000000",
      circulatingSupply: rows[0]?.circulating ?? "0",
      holders: parseInt(rows[0]?.holders ?? "0"),
      price: "0.01",
    };
  },

  async getEarnRules(): Promise<EarnRule[]> {
    return EARN_RULES;
  },

  async getTransactionHistory(userId: string): Promise<unknown[]> {
    const { rows } = await pool.query(
      "SELECT * FROM loyalty_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
      [userId],
    );
    return rows;
  },
};
