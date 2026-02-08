import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Checkbox from 'expo-checkbox';

interface DisclaimerCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
}

/**
 * Disclaimer checkbox component for sign up
 * Displays the non-therapy disclaimer with tappable terms link
 */
export function DisclaimerCheckbox({
  checked,
  onChange,
  onTermsPress,
  onPrivacyPress
}: DisclaimerCheckboxProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Checkbox
        value={checked}
        onValueChange={onChange}
        color={checked ? '#4B5563' : undefined}
        style={styles.checkbox}
      />
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          본 서비스는 전문 상담을 대체하지 않습니다.{' '}
          <Pressable onPress={onTermsPress}>
            <Text style={styles.link}>이용약관</Text>
          </Pressable>
          {' 및 '}
          <Pressable onPress={onPrivacyPress}>
            <Text style={styles.link}>개인정보처리방침</Text>
          </Pressable>
          에 동의합니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  checkbox: {
    marginTop: 2,
    marginRight: 12,
    width: 20,
    height: 20,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  link: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});
