import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Subscription } from '../types';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  ConnectSources: undefined;
  ScanProgress: { sources: string[] };
  Main: undefined;
  SubscriptionDetail: { subscriptionId: string };
  Paywall: { feature?: string };
  LegalTemplatePreview: { subscription: Subscription; jurisdiction: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  SubscriptionList: undefined;
  Settings: undefined;
};

export type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;
export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
export type ConnectSourcesScreenProps = NativeStackScreenProps<RootStackParamList, 'ConnectSources'>;
export type ScanProgressScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanProgress'>;
export type SubscriptionDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'SubscriptionDetail'>;
export type PaywallScreenProps = NativeStackScreenProps<RootStackParamList, 'Paywall'>;
export type LegalTemplatePreviewScreenProps = NativeStackScreenProps<RootStackParamList, 'LegalTemplatePreview'>;
