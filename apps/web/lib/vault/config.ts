export const VAULT_PRODUCT_NAME = "Galaxy Vault";
export const VAULT_PRICE_CENTS = 20000;
export const VAULT_CURRENCY = "usd";
export const VAULT_BILLING_INTERVAL = "year";
export const VAULT_FOUNDING_CAP = 1000;

export function getVaultCheckoutConfig() {
  return {
    productName: VAULT_PRODUCT_NAME,
    priceCents: VAULT_PRICE_CENTS,
    currency: VAULT_CURRENCY,
    billingInterval: VAULT_BILLING_INTERVAL,
    stripePriceId: process.env.STRIPE_VAULT_PRICE_ID ?? null,
    successPath: "/vault/welcome?session_id={CHECKOUT_SESSION_ID}",
    cancelPath: "/vault?cancel=true",
  };
}

export function getVaultDiscordConfig() {
  return {
    guildId: process.env.DISCORD_GALAXY_GUILD_ID ?? null,
    vaultMemberRoleId: process.env.DISCORD_VAULT_MEMBER_ROLE_ID ?? null,
    vaultFoundingMemberRoleId:
      process.env.DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID ?? null,
  };
}
