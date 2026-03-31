import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as MailComposer from 'expo-mail-composer';
import type { LegalTemplatePreviewScreenProps } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { generateLegalTemplate } from '../engine/generateLegalTemplate';
import type { Jurisdiction } from '../types';

export default function LegalTemplatePreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<LegalTemplatePreviewScreenProps['route']>();
  const [sending, setSending] = useState(false);

  const { subscription, jurisdiction } = route.params;
  const template = generateLegalTemplate(subscription, jurisdiction as Jurisdiction);

  async function handleSendViaEmail() {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('No Mail App', 'No email app is configured on this device.');
      return;
    }

    setSending(true);
    try {
      const recipients = subscription.supportEmail ? [subscription.supportEmail] : [];
      const result = await MailComposer.composeAsync({
        recipients,
        subject: template.subject,
        body: template.body,
        isHtml: false,
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert('Email Opened', 'The mail composer was opened. Review before sending.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: 'SpaceMono' }}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.text, fontSize: 14, fontFamily: 'SpaceMono', fontWeight: '600' }}>
              {jurisdiction} Template
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono', marginTop: 2 }}>
              {subscription.providerName}
            </Text>
          </View>
          <View style={{ backgroundColor: Colors.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: Colors.primary }}>
            <Text style={{ color: Colors.primary, fontSize: 9, fontFamily: 'SpaceMono' }}>{jurisdiction}</Text>
          </View>
        </View>

        {/* Notice */}
        <View style={{ backgroundColor: Colors.warningDim, borderBottomWidth: 1, borderBottomColor: Colors.warning, padding: 12 }}>
          <Text style={{ color: Colors.warning, fontSize: 10, fontFamily: 'SpaceMono', lineHeight: 16 }}>
            REVIEW before sending. This template is auto-generated.{'\n'}
            Fill in [bracketed fields] before sending.
          </Text>
        </View>

        {/* Template preview */}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Subject */}
          <View style={{ backgroundColor: Colors.card, borderRadius: 6, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ color: Colors.textMuted, fontSize: 9, fontFamily: 'SpaceMono', letterSpacing: 2, marginBottom: 4 }}>SUBJECT</Text>
            <Text style={{ color: Colors.text, fontSize: 12, fontFamily: 'SpaceMono' }}>{template.subject}</Text>
          </View>

          {/* Body */}
          <View style={{ backgroundColor: Colors.card, borderRadius: 6, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ color: Colors.textMuted, fontSize: 9, fontFamily: 'SpaceMono', letterSpacing: 2, marginBottom: 12 }}>BODY</Text>
            <Text
              style={{
                color: Colors.text,
                fontSize: 12,
                fontFamily: 'SpaceMono',
                lineHeight: 20,
              }}
              selectable
            >
              {template.body}
            </Text>
          </View>

          <View style={{ height: 20 }} />

          {/* Send button */}
          <PrimaryButton
            title="Open in Mail App"
            onPress={handleSendViaEmail}
            loading={sending}
            size="lg"
          />

          <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
            Opens native mail composer.{'\n'}
            Email is never sent automatically.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
