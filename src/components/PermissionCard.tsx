import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PendingPermission, Question } from '@claude-mobile/protocol';
import { Icon } from './Icon';
import { fonts, useTheme } from '@/theme';

type Answer = (decision: 'allow' | 'allowAlways' | 'deny', extra?: { message?: string; answers?: Record<string, string> }) => void;

export function PermissionCard({ pending, onAnswer }: { pending: PendingPermission; onAnswer: Answer }) {
  if (pending.questions?.length) return <QuestionCard key={pending.requestId} questions={pending.questions} onAnswer={onAnswer} />;
  return <ToolApproval key={pending.requestId} pending={pending} onAnswer={onAnswer} />;
}

function ToolApproval({ pending, onAnswer }: { pending: PendingPermission; onAnswer: Answer }) {
  const t = useTheme();
  const [reason, setReason] = useState('');
  const detail = pending.summary || JSON.stringify(pending.input, null, 2);
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.line3 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.badge, { backgroundColor: t.warnBg }]}>
          <Icon name="terminal" size={18} color={t.warnText} />
        </View>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: t.text }}>Allow {pending.toolName}?</Text>
      </View>
      <ScrollView style={[styles.detail, { backgroundColor: t.code }]}>
        <Text selectable style={{ fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: t.text }}>
          {detail}
        </Text>
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => onAnswer('allow')} style={[styles.primary, { backgroundColor: t.primary }]}>
        <Text style={{ color: t.onPrimary, fontSize: 16, fontWeight: '500' }}>Allow once</Text>
      </Pressable>
      {pending.canAlwaysAllow ? (
        <Pressable accessibilityRole="button" onPress={() => onAnswer('allowAlways')} style={[styles.secondary, { borderColor: t.line3 }]}>
          <Text style={{ color: t.text, fontSize: 15 }}>Always allow in this project</Text>
        </Pressable>
      ) : null}
      <View style={[styles.denyRow, { backgroundColor: t.fill }]}>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Deny, and tell Claude what to do instead"
          placeholderTextColor={t.text3}
          accessibilityLabel="Tell Claude what to do instead"
          style={{ flex: 1, fontSize: 15, color: t.text, height: 48 }}
        />
        <Pressable accessibilityRole="button" onPress={() => onAnswer('deny', { message: reason })} style={[styles.deny, { backgroundColor: t.card }]}>
          <Text style={{ color: t.danger, fontSize: 14, fontWeight: '600' }}>Deny</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuestionCard({ questions, onAnswer }: { questions: Question[]; onAnswer: Answer }) {
  const t = useTheme();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const q = questions[index]!;
  const chosen = picked[q.question] ?? [];
  const last = index === questions.length - 1;

  const toggle = (label: string) => {
    const next = q.multiSelect ? (chosen.includes(label) ? chosen.filter((l) => l !== label) : [...chosen, label]) : [label];
    setPicked({ ...picked, [q.question]: next });
    setOther({ ...other, [q.question]: '' });
  };

  const answerOf = (question: Question) => other[question.question]?.trim() || (picked[question.question] ?? []).join(', ');
  const canContinue = !!answerOf(q);

  const next = () => {
    if (!last) return setIndex(index + 1);
    onAnswer('allow', { answers: Object.fromEntries(questions.map((x) => [x.question, answerOf(x)])) });
  };

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.line3 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.header, { backgroundColor: t.fill, color: t.text2 }]}>{q.header}</Text>
        {questions.length > 1 ? <Text style={{ fontSize: 13, color: t.text3 }}>{`${index + 1} of ${questions.length}`}</Text> : null}
      </View>
      <Text style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: t.text }}>{q.question}</Text>
      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
        {q.options.map((o) => {
          const on = chosen.includes(o.label);
          return (
            <Pressable
              key={o.label}
              accessibilityRole={q.multiSelect ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: on }}
              onPress={() => toggle(o.label)}
              style={[styles.option, on ? { borderColor: t.clay, borderWidth: 1.5, backgroundColor: t.clayTint } : { borderColor: t.line2 }]}
            >
              <View style={[styles.dot, { borderColor: on ? t.clay : t.text3, borderWidth: on ? 5 : 1.5, borderRadius: q.multiSelect ? 4 : 9 }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }}>{o.label}</Text>
                {o.description ? <Text style={{ fontSize: 14, lineHeight: 19, color: t.text2 }}>{o.description}</Text> : null}
              </View>
            </Pressable>
          );
        })}
        <TextInput
          value={other[q.question] ?? ''}
          onChangeText={(s) => {
            setOther({ ...other, [q.question]: s });
            if (s) setPicked({ ...picked, [q.question]: [] });
          }}
          placeholder="Other…"
          placeholderTextColor={t.text3}
          accessibilityLabel="Other answer"
          style={[styles.otherInput, { borderColor: t.line2, color: t.text }]}
        />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={() => onAnswer('deny', { message: 'The user skipped the question.' })} style={[styles.secondary, { flex: 1, borderColor: t.line3 }]}>
          <Text style={{ color: t.text, fontSize: 15 }}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={next}
          style={[styles.primary, { flex: 2, backgroundColor: t.primary, opacity: canContinue ? 1 : 0.4 }]}
        >
          <Text style={{ color: t.onPrimary, fontSize: 16, fontWeight: '500' }}>{last ? 'Submit' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 0.5, borderRadius: 20, padding: 16, gap: 12 },
  badge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detail: { maxHeight: 180, borderRadius: 12, padding: 12 },
  primary: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 48, borderRadius: 12, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  denyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 6, borderRadius: 12 },
  deny: { height: 36, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  header: { fontSize: 12, fontWeight: '500', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 14, borderWidth: 0.5 },
  dot: { width: 18, height: 18, marginTop: 2 },
  otherInput: { height: 48, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
});
