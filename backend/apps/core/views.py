"""Core views for public pages."""

from django.http import HttpResponse


def privacy_policy(request):
    """Public privacy policy page for App Store submission."""
    html = '''<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>개인정보처리방침 - 커플AI</title>
<style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#333}h1{color:#6366F1}h2{color:#4F46E5;margin-top:2em}</style></head>
<body>
<h1>개인정보처리방침</h1>
<p>최종 수정일: 2026-02-09</p>
<h2>1. 수집하는 개인정보</h2>
<p>커플AI는 서비스 제공을 위해 다음 정보를 수집합니다: 이메일 주소, 대화 내용(암호화 저장), 음성 녹음(분석 후 즉시 삭제).</p>
<h2>2. 개인정보의 이용 목적</h2>
<p>수집된 정보는 AI 리프레이밍 서비스 제공, 대화 패턴 분석, 서비스 개선에 사용됩니다.</p>
<h2>3. 개인정보의 보관 및 파기</h2>
<p>음성 파일은 분석 완료 즉시 삭제됩니다. 대화 내용은 Fernet 암호화로 저장되며, 계정 삭제 시 모든 데이터가 익명화 처리됩니다.</p>
<h2>4. 이용자의 권리</h2>
<p>이용자는 언제든지 데이터 내보내기 및 계정 삭제를 요청할 수 있습니다 (설정 > 데이터 관리).</p>
<h2>5. 연락처</h2>
<p>개인정보 관련 문의: privacy@couplesai.com</p>
</body></html>'''
    return HttpResponse(html, content_type='text/html; charset=utf-8')


def terms_of_service(request):
    """Public terms of service page for App Store submission."""
    html = '''<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>이용약관 - 커플AI</title>
<style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#333}h1{color:#6366F1}h2{color:#4F46E5;margin-top:2em}</style></head>
<body>
<h1>이용약관</h1>
<p>최종 수정일: 2026-02-09</p>
<h2>1. 서비스 소개</h2>
<p>커플AI는 AI 기술을 활용한 커플 소통 도우미 서비스입니다. 본 서비스는 전문 상담 서비스가 아닙니다.</p>
<h2>2. 이용 조건</h2>
<p>본 서비스는 만 17세 이상 이용 가능합니다. 서비스 이용을 위해 이메일 인증이 필요합니다.</p>
<h2>3. 서비스 제한</h2>
<p>본 서비스는 의료 서비스나 전문 심리 상담을 대체하지 않습니다. 위기 상황 시 전문 기관(자살예방상담전화 1393, 정신건강위기상담전화 1577-0199)에 연락하세요.</p>
<h2>4. 면책 조항</h2>
<p>AI 분석 결과는 참고용이며, 서비스 제공자는 AI 응답의 정확성을 보장하지 않습니다.</p>
<h2>5. 연락처</h2>
<p>서비스 관련 문의: support@couplesai.com</p>
</body></html>'''
    return HttpResponse(html, content_type='text/html; charset=utf-8')
