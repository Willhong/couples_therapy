import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme';
import { headingFont } from '@/theme/typography';

/**
 * Privacy Policy screen (개인정보처리방침)
 * PIPA compliance - Article 30
 */
export default function PrivacyPolicyScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>개인정보처리방침</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Privacy Highlight Box */}
        <View style={styles.privacyHighlight}>
          <ShieldCheck size={20} color={colors.primary} />
          <Text style={styles.privacyHighlightText}>개인정보는 안전하게 보호됩니다</Text>
        </View>

        <Section title="1. 수집하는 개인정보 항목">
          <Text style={styles.text}>
            CouplesAI는 다음과 같은 개인정보를 수집합니다:{'\n\n'}
            • 필수항목: 이메일 주소{'\n'}
            • 선택항목: 이름{'\n'}
            • 자동수집: 대화 내용, 음성 녹음 데이터, 서비스 이용 기록
          </Text>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용목적">
          <Text style={styles.text}>
            수집한 개인정보는 다음의 목적으로만 이용됩니다:{'\n\n'}
            • 회원가입 및 본인확인{'\n'}
            • AI 기반 대화 분석 및 관계 개선 도구 제공{'\n'}
            • 서비스 품질 향상 및 맞춤형 콘텐츠 제공{'\n'}
            • 고객 지원 및 문의 응대
          </Text>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용기간">
          <Text style={styles.text}>
            회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기됩니다.{'\n\n'}
            단, 관계 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보관합니다.
          </Text>
        </Section>

        <Section title="4. 개인정보의 파기절차 및 방법">
          <Text style={styles.text}>
            회원 탈퇴 시 다음과 같이 처리됩니다:{'\n\n'}
            • 계정 정보: 즉시 익명화 처리{'\n'}
            • 대화 내용 및 녹음: 즉시 삭제{'\n'}
            • 백업 데이터: 30일 이내 완전 삭제
          </Text>
        </Section>

        <Section title="5. 이용자의 권리">
          <Text style={styles.text}>
            이용자는 언제든지 다음의 권리를 행사할 수 있습니다:{'\n\n'}
            • 개인정보 열람 요구{'\n'}
            • 개인정보 정정 및 삭제 요구{'\n'}
            • 개인정보 처리 정지 요구{'\n'}
            • 개인정보 이동 요구{'\n\n'}
            설정 메뉴에서 "내 데이터 내보내기" 및 "계정 삭제"를 통해 행사 가능합니다.
          </Text>
        </Section>

        <Section title="6. 개인정보의 안전성 확보조치">
          <Text style={styles.text}>
            CouplesAI는 개인정보를 안전하게 보호하기 위해:{'\n\n'}
            • 대화 내용 암호화 저장{'\n'}
            • 전송 구간 암호화 (HTTPS/TLS){'\n'}
            • 접근 권한 관리 및 로그 기록{'\n'}
            • 정기적인 보안 점검
          </Text>
        </Section>

        <Section title="7. 개인정보 보호책임자">
          <Text style={styles.text}>
            개인정보 보호와 관련한 문의사항은 아래로 연락주시기 바랍니다:{'\n\n'}
            이메일: privacy@couplesai.app{'\n'}
            응답 시간: 영업일 기준 48시간 이내
          </Text>
        </Section>

        <Section title="8. 개인정보처리방침 변경">
          <Text style={styles.text}>
            본 방침은 2026년 2월 8일부터 시행됩니다.{'\n\n'}
            변경 시 앱 내 공지를 통해 알려드립니다.
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
    fontSize: 24,
    fontWeight: '700',
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
  privacyHighlight: {
    backgroundColor: '#E8EFEA',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  privacyHighlightText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
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
