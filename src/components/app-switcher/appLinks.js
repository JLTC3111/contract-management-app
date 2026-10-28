// Kept local to each independently deployed ICUE app; no cross-repository runtime dependency.
export const APP_URLS = Object.freeze({
  website: 'https://vi.icue.vn/',
  hr: 'https://hr.icue.vn/',
  contracts: 'https://contract.icue.vn/',
});

const COPY = {
  en: ['ICUE Apps', 'Explore ICUE', 'Current app', 'Staff Portals', 'ICUE Website', 'HR Portal', 'Contract Management', 'About ICUE, research & news', 'People, attendance & leave', 'Agreements & contract records', 'Opens in a new tab', 'Close'],
  vi: ['Ứng dụng ICUE', 'Khám phá ICUE', 'Đang sử dụng', 'Cổng nội bộ', 'Website ICUE', 'Cổng nhân sự', 'Quản lý hợp đồng', 'Giới thiệu, nghiên cứu & tin tức', 'Nhân sự, chấm công & nghỉ phép', 'Hợp đồng & hồ sơ', 'Mở trong thẻ mới', 'Đóng'],
  de: ['ICUE Apps', 'ICUE entdecken', 'Aktuelle App', 'Mitarbeiterportale', 'ICUE Website', 'Personalportal', 'Vertragsverwaltung', 'Über ICUE, Forschung & Nachrichten', 'Personal, Zeiterfassung & Urlaub', 'Verträge & Unterlagen', 'Öffnet in einem neuen Tab', 'Schließen'],
  fr: ['Applications ICUE', 'Découvrir ICUE', 'Application actuelle', 'Portails du personnel', 'Site ICUE', 'Portail RH', 'Gestion des contrats', 'ICUE, recherche et actualités', 'Personnel, présence et congés', 'Contrats et dossiers', 'Ouvre un nouvel onglet', 'Fermer'],
  es: ['Aplicaciones ICUE', 'Explorar ICUE', 'Aplicación actual', 'Portales del personal', 'Sitio web ICUE', 'Portal de RR. HH.', 'Gestión de contratos', 'ICUE, investigación y noticias', 'Personal, asistencia y permisos', 'Contratos y expedientes', 'Se abre en una pestaña nueva', 'Cerrar'],
  ja: ['ICUE アプリ', 'ICUE を探索', '現在のアプリ', '職員ポータル', 'ICUE ウェブサイト', '人事ポータル', '契約管理', 'ICUE・研究・ニュース', '職員・勤怠・休暇', '契約・記録', '新しいタブで開きます', '閉じる'],
  ko: ['ICUE 앱', 'ICUE 둘러보기', '현재 앱', '직원 포털', 'ICUE 웹사이트', '인사 포털', '계약 관리', 'ICUE 소개, 연구 및 소식', '직원, 근태 및 휴가', '계약 및 기록', '새 탭에서 열림', '닫기'],
  th: ['แอป ICUE', 'สำรวจ ICUE', 'แอปปัจจุบัน', 'พอร์ทัลพนักงาน', 'เว็บไซต์ ICUE', 'พอร์ทัลบุคลากร', 'จัดการสัญญา', 'เกี่ยวกับ ICUE งานวิจัยและข่าวสาร', 'บุคลากร การเข้างานและการลา', 'สัญญาและเอกสาร', 'เปิดในแท็บใหม่', 'ปิด'],
  ru: ['Приложения ICUE', 'Откройте ICUE', 'Текущее приложение', 'Порталы сотрудников', 'Сайт ICUE', 'Кадровый портал', 'Управление договорами', 'Об ICUE, исследования и новости', 'Сотрудники, посещаемость и отпуска', 'Договоры и документы', 'Открывается в новой вкладке', 'Закрыть'],
  zh: ['ICUE 应用', '探索 ICUE', '当前应用', '员工门户', 'ICUE 网站', '人事门户', '合同管理', '关于 ICUE、研究与新闻', '员工、考勤与休假', '合同与档案', '在新标签页中打开', '关闭'],
};

export function getAppNavigation(locale = 'en') {
  const code = String(locale).toLowerCase().split(/[-_]/)[0];
  const language = ({ vn: 'vi', jp: 'ja', kr: 'ko' })[code] || code;
  const [trigger, heading, current, portals, website, hr, contracts, websiteDescription, hrDescription, contractsDescription, newTab, close] = COPY[language] || COPY.en;
  const websiteUrl = language === 'en'
    ? 'https://en.icue.vn/'
    : language === 'vi' || !COPY[language]
      ? APP_URLS.website
      : ['de', 'fr', 'ja', 'ko'].includes(language)
        ? `${APP_URLS.website}?lang=${language}`
        : 'https://en.icue.vn/';
  return {
    trigger, heading, current, portals, newTab, close,
    apps: [
      { id: 'website', label: website, description: websiteDescription, href: websiteUrl },
      { id: 'hr', label: hr, description: hrDescription, href: APP_URLS.hr },
      { id: 'contracts', label: contracts, description: contractsDescription, href: APP_URLS.contracts },
    ],
  };
}
