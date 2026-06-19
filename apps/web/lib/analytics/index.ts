/**
 * Product / business analytics toolkit barrel — namespaced re-exports of every pure library in
 * this directory. Part of the Galaxy Sports Edge cohesive analytics layer.
 *
 * Usage: import { abTesting } from '@/lib/analytics';
 *
 * 27 modules. Namespaced (export * as) so identically-named helpers
 * across libraries (e.g. dkProjection) never collide.
 */

export * as abTesting from './ab-testing';
export * as attributionAnalytics from './attribution-analytics';
export * as betTracker from './bet-tracker';
export * as cohortAnalysis from './cohort-analysis';
export * as cohortAnalytics from './cohort-analytics';
export * as contentAnalytics from './content-analytics';
export * as customerLifecycle from './customer-lifecycle';
export * as emailAnalytics from './email-analytics';
export * as engagement from './engagement';
export * as events from './events';
export * as funnelAnalytics from './funnel-analytics';
export * as geographicAnalytics from './geographic-analytics';
export * as lineMovement from './line-movement';
export * as marketAnalytics from './market-analytics';
export * as parlay from './parlay';
export * as pickDisplay from './pick-display';
export * as pickPerformance from './pick-performance';
export * as predictiveAnalytics from './predictive-analytics';
export * as pricingAnalytics from './pricing-analytics';
export * as productAnalytics from './product-analytics';
export * as propAnalytics from './prop-analytics';
export * as recommendationEngine from './recommendation-engine';
export * as retentionAnalytics from './retention-analytics';
export * as socialAnalytics from './social-analytics';
export * as streak from './streak';
export * as subscriptionAnalytics from './subscription-analytics';
export * as userJourney from './user-journey';
