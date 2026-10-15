import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PairingPayload } from '@claude-mobile/protocol';
import { IconButton, Notice, PrimaryButton } from '@/components/ui';
import { Spark } from '@/components/Icon';
import { api, ApiError } from '@/lib/api';
import { useConnection } from '@/lib/connection';
import { fonts, useTheme } from '@/theme';

const steps = [
  'Install Tailscale on this phone and your Mac, signed in to the same account.',
  'On your Mac, start the server and show the pairing code:',
  'Scan the QR code it shows. You only do this once.',
];

export default function PairScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const save = useConnection((s) => s.save);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function connect(candidate: unknown) {
    const parsed = PairingPayload.safeParse(candidate);
    if (!parsed.success) {
      setError("That doesn't look like a pairing code from claude-mobile.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const health = await api.health(parsed.data);
      await save({ ...parsed.data, name: health.name });
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not connect.');
    } finally {
      setBusy(false);
    }
  }

  async function startScan() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('Camera access is needed to scan. You can enter the address instead.');
        return;
      }
    }
    setError(undefined);
    setScanning(true);
  }

  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            busy
              ? undefined
              : ({ data }) => {
                  setScanning(false);
                  let payload: unknown;
                  try {
                    payload = JSON.parse(data);
                  } catch {
                    payload = undefined;
                  }
                  connect(payload);
                }
          }
        />
        <View style={{ position: 'absolute', top: insets.top + 8, left: 8 }}>
          <IconButton name="close" label="Cancel scanning" color="#FFFFFF" onPress={() => setScanning(false)} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 28, flexGrow: 1 }}>
        <View style={{ gap: 16 }}>
          <Spark size={44} />
          <Text style={{ fontFamily: fonts.serif, fontSize: 38, lineHeight: 46, color: t.text }}>Connect to your Mac</Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: t.text2 }}>
            Your phone talks only to your Mac, over your private Tailscale network. Sessions stay on the Mac.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {steps.map((step, i) => (
            <View key={i} style={[styles.step, { backgroundColor: t.card, borderColor: t.line2 }]}>
              <View style={[styles.stepNum, { backgroundColor: t.fill }]}>
                <Text style={{ color: t.text, fontWeight: '500' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ fontSize: 15, lineHeight: 22, color: t.text }}>{step}</Text>
                {i === 1 ? (
                  <Text selectable style={[styles.code, { backgroundColor: t.code, color: t.text }]}>
                    cd claude-mobile-be{'\n'}pnpm start{'\n'}pnpm pair
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {error ? <Notice text={error} /> : null}

        {manual ? (
          <View style={{ gap: 10 }}>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="http://100.x.y.z:8787"
              placeholderTextColor={t.text3}
              accessibilityLabel="Mac address"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[styles.input, { backgroundColor: t.card, borderColor: t.line2, color: t.text }]}
            />
            <TextInput
              value={token}
              onChangeText={setToken}
              placeholder="Pairing token"
              placeholderTextColor={t.text3}
              accessibilityLabel="Pairing token"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[styles.input, { backgroundColor: t.card, borderColor: t.line2, color: t.text }]}
            />
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <View style={{ gap: 8 }}>
          {manual ? (
            <PrimaryButton
              label="Connect"
              busy={busy}
              onPress={() => connect({ v: 1, url: address.trim().replace(/\/$/, ''), token: token.trim(), name: 'Mac' })}
            />
          ) : (
            <PrimaryButton label="Scan QR code" icon="scan" busy={busy} onPress={startScan} />
          )}
          <Pressable accessibilityRole="button" onPress={() => setManual(!manual)} style={styles.link}>
            <Text style={{ color: t.text, fontSize: 15, textDecorationLine: 'underline' }}>
              {manual ? 'Scan a QR code instead' : 'Enter address manually'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 14, padding: 16, borderWidth: 0.5, borderRadius: 16 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  code: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontFamily: fonts.mono, fontSize: 13, overflow: 'hidden' },
  input: { height: 48, borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  link: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
