import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

/**
 * Terms of Service screen (이용약관)
 */
export default function TermsScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>서비스 이용약관</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Section title="1. 서비스의 목적">
          <Text style={styles.text}>
            CouplesAI는 AI 기반의 대화 분석 및 관계 개선 도구를 제공합니다.{'\n\n'}
            본 서비스는 전문적인 심리 치료나 상담을 대체하지 않으며,
            보조적인 자기 성찰 도구로 활용되어야 합니다.
          </Text>
        </Section>

        <Section title="2. 이용 조건">
          <Text style={styles.text}>
            • 만 19세 이상만 이용 가능합니다{'\n'}
            • 정확한 정보로 가입해야 합니다{'\n'}
            • 계정 정보는 타인에게 양도할 수 없습니다{'\n'}
            • 서비스를 불법적이거나 부적절한 목적으로 사용할 수 없습니다
          </Text>
        </Section>

        <Section title="3. 면책 조항">
          <Text style={styles.text}>
            CouplesAI는 다음 사항에 대해 책임을 지지 않습니다:{'\n\n'}
            • 본 서비스는 의료 서비스가 아니며, 전문적인 상담이나 치료를 대체하지 않습니다{'\n'}
            • AI 분석 결과의 정확성이나 적합성을 보장하지 않습니다{'\n'}
            • 서비스 이용으로 인한 관계 변화나 결과에 대한 책임은 이용자에게 있습니다{'\n'}
            • 위기 상황(자해, 타해 위험)에서는 즉시 전문 기관에 연락하시기 바랍니다
          </Text>
        </Section>

        <Section title="4. 서비스 변경 및 중단">
          <Text style={styles.text}>
            CouplesAI는 다음의 경우 서비스를 변경하거나 중단할 수 있습니다:{'\n\n'}
            • 서비스 개선 및 업데이트{'\n'}
            • 시스템 유지보수{'\n'}
            • 법적 요구사항 준수{'\n\n'}
            중요한 변경사항은 사전에 공지됩니다.
          </Text>
        </Section>

        <Section title="5. 지적재산권">
          <Text style={styles.text}>
            서비스의 모든 콘텐츠, 디자인, 로고, 소프트웨어는 CouplesAI의 지적재산입니다.{'\n\n'}
            이용자가 생성한 콘텐츠의 소유권은 이용자에게 있으며,
            서비스 제공을 위한 범위 내에서만 사용됩니다.
          </Text>
        </Section>

        <Section title="6. 계정 해지">
          <Text style={styles.text}>
            이용자는 언제든지 계정을 삭제할 수 있습니다.{'\n\n'}
            설정 메뉴의 "계정 삭제"를 통해 즉시 처리되며,
            모든 개인정보와 대화 내용이 삭제됩니다.
          </Text>
        </Section>

        <Section title="7. 준거법 및 관할">
          <Text style={styles.text}>
            본 약관은 대한민국 법률에 따라 해석되며,
            서비스 이용과 관련한 분쟁은 대한민국 법원의 관할에 따릅니다.
          </Text>
        </Section>

        <Section title="8. 긴급 상황 안내">
          <Text style={styles.text}>
            자살, 자해, 타해 위험이 있는 경우:{'\n\n'}
            • 자살예방상담전화: 1393{'\n'}
            • 정신건강위기상담전화: 1577-0199{'\n'}
            • 응급상황: 119{'\n\n'}
            본 서비스는 위기 개입 도구가 아니므로,
            위급한 상황에서는 반드시 전문 기관에 연락하시기 바랍니다.
          </Text>
        </Section>

        <Section title="9. 이용약관 변경">
          <Text style={styles.text}>
            본 약관은 2026년 2월 8일부터 시행됩니다.{'\n\n'}
            변경 시 앱 내 공지를 통해 알려드리며,
            변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>시행일: 2026년 2월 8일</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: headingFont,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
