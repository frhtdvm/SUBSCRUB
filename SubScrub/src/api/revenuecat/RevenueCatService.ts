/**
 * RevenueCat Service
 *
 * Production flow:
 * 1. Initialize SDK with API key on app boot
 * 2. Check entitlement 'lifetime_unlock' on app start and after purchase
 * 3. Purchase product 'subscrumb_lifetime_1999' (non-consumable)
 * 4. Restore purchases
 *
 * Security rules:
 * - Never log purchase payloads
 * - Never send purchase data to custom backend
 * - All validation is done server-side by RevenueCat
 *
 * Expo Go compatibility:
 * - react-native-purchases is not bundled in Expo Go
 * - Dynamic require with try/catch prevents crash on import
 * - All calls short-circuit to demo mode when SDK is unavailable
 */

import type { PurchaseResult, RestoreResult } from '../../types';
import { ENTITLEMENT_ID, PRODUCT_ID } from '../../constants';

// Lazy-load so Expo Go doesn't crash on missing native module
let _Purchases: any = null;
function getPurchases(): any {
  if (_Purchases) return _Purchases;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _Purchases = require('react-native-purchases').default;
  } catch {
    _Purchases = null;
  }
  return _Purchases;
}

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

export function isRevenueCatConfigured(): boolean {
  return REVENUECAT_API_KEY.length > 0 && getPurchases() !== null;
}

export async function initRevenueCat(): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  try {
    getPurchases().configure({ apiKey: REVENUECAT_API_KEY });
  } catch {
    // Configuration failed silently – app continues in demo mode
  }
}

export async function checkEntitlement(): Promise<boolean> {
  if (!isRevenueCatConfigured()) return false;
  try {
    const info = await getPurchases().getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export async function purchaseLifetime(): Promise<PurchaseResult> {
  if (!isRevenueCatConfigured()) {
    return { success: false, entitlementActive: false, isDemo: true };
  }
  try {
    const Purchases = getPurchases();
    const offerings = await Purchases.getOfferings();
    const pkg =
      offerings.current?.availablePackages.find(
        (p: any) => p.product.identifier === PRODUCT_ID
      ) ?? offerings.current?.lifetime ?? undefined;

    if (!pkg) {
      return { success: false, entitlementActive: false, error: 'Product not found' };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: true, entitlementActive: active };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) {
      return { success: false, entitlementActive: false, error: 'Purchase cancelled' };
    }
    return { success: false, entitlementActive: false, error: err.message };
  }
}

export async function restorePurchases(): Promise<RestoreResult> {
  if (!isRevenueCatConfigured()) {
    return { success: false, entitlementActive: false, isDemo: true };
  }
  try {
    const info = await getPurchases().restorePurchases();
    const active = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: true, entitlementActive: active };
  } catch (e) {
    return { success: false, entitlementActive: false, error: String(e) };
  }
}
