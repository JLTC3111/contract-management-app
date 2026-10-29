import { getAppNavigation } from './appLinks.js';

const COPY = {
  vi: {
    heading: 'Khám phá hệ sinh thái ICUE',
    subtitle: 'Các nền tảng và công cụ trong hệ sinh thái ICUE',
    public: 'CÔNG KHAI', internal: 'NỘI BỘ', features: 'CHỨC NĂNG CHÍNH', current: 'Bạn đang ở đây',
    website: ['Giới thiệu, nghiên cứu và hoạt động ICUE', 'Mở website ICUE', ['Giới thiệu & đội ngũ', 'Nghiên cứu & dự án', 'Tin tức & hoạt động', 'Khám phá ICUE']],
    hr: ['Quản lý nhân sự và thời gian làm việc', 'Mở cổng nhân sự', ['Hồ sơ nhân sự', 'Chấm công & giờ làm', 'Nghỉ phép & phê duyệt', 'Báo cáo hàng tháng']],
    contracts: ['Quản lý hợp đồng và hồ sơ tập trung', 'Mở quản lý hợp đồng', ['Danh sách hợp đồng', 'Thông tin & hồ sơ', 'Theo dõi trạng thái', 'Tra cứu & quản lý']],
  },
  en: {
    heading: 'Explore the ICUE ecosystem',
    subtitle: 'Platforms and tools across the ICUE ecosystem',
    public: 'PUBLIC', internal: 'INTERNAL', features: 'KEY FUNCTIONS', current: 'You are here',
    website: ['Discover ICUE, our research and activities', 'Open ICUE website', ['About & team', 'Research & projects', 'News & activities', 'Explore ICUE']],
    hr: ['Manage people and working time', 'Open HR portal', ['Staff profiles', 'Attendance & hours', 'Leave & approvals', 'Monthly reports']],
    contracts: ['Contracts and records in one place', 'Open contract management', ['Contract list', 'Details & records', 'Status tracking', 'Search & management']],
  },
  de: {
    heading: 'Das ICUE-Ökosystem entdecken',
    subtitle: 'Plattformen und Werkzeuge im ICUE-Ökosystem',
    public: 'ÖFFENTLICH', internal: 'INTERN', features: 'HAUPTFUNKTIONEN', current: 'Sie sind hier',
    website: ['ICUE, Forschung und Aktivitäten kennenlernen', 'ICUE-Website öffnen', ['Über uns & Team', 'Forschung & Projekte', 'Neuigkeiten & Aktivitäten', 'ICUE entdecken']],
    hr: ['Personal und Arbeitszeit verwalten', 'Personalportal öffnen', ['Personalprofile', 'Anwesenheit & Arbeitszeit', 'Urlaub & Genehmigungen', 'Monatsberichte']],
    contracts: ['Verträge und Unterlagen zentral verwalten', 'Vertragsverwaltung öffnen', ['Vertragsübersicht', 'Details & Unterlagen', 'Statusverfolgung', 'Suche & Verwaltung']],
  },
  fr: {
    heading: 'Découvrez l’écosystème ICUE',
    subtitle: 'Les plateformes et outils de l’écosystème ICUE',
    public: 'PUBLIC', internal: 'INTERNE', features: 'FONCTIONS PRINCIPALES', current: 'Vous êtes ici',
    website: ['Découvrez ICUE, ses recherches et ses activités', 'Ouvrir le site ICUE', ['Présentation & équipe', 'Recherche & projets', 'Actualités & activités', 'Découvrir ICUE']],
    hr: ['Gérer le personnel et le temps de travail', 'Ouvrir le portail RH', ['Profils du personnel', 'Présence & horaires', 'Congés & validations', 'Rapports mensuels']],
    contracts: ['Centraliser les contrats et les dossiers', 'Ouvrir la gestion des contrats', ['Liste des contrats', 'Informations & dossiers', 'Suivi des statuts', 'Recherche & gestion']],
  },
  es: {
    heading: 'Explora el ecosistema ICUE',
    subtitle: 'Plataformas y herramientas del ecosistema ICUE',
    public: 'PÚBLICO', internal: 'INTERNO', features: 'FUNCIONES PRINCIPALES', current: 'Estás aquí',
    website: ['Conoce ICUE, sus investigaciones y actividades', 'Abrir el sitio ICUE', ['Presentación y equipo', 'Investigación y proyectos', 'Noticias y actividades', 'Explorar ICUE']],
    hr: ['Gestiona el personal y el tiempo de trabajo', 'Abrir el portal de RR. HH.', ['Perfiles del personal', 'Asistencia y horas', 'Permisos y aprobaciones', 'Informes mensuales']],
    contracts: ['Contratos y expedientes en un solo lugar', 'Abrir gestión de contratos', ['Lista de contratos', 'Información y expedientes', 'Seguimiento de estados', 'Búsqueda y gestión']],
  },
  ja: {
    heading: 'ICUEのエコシステムを探索',
    subtitle: 'ICUEのプラットフォームとツール',
    public: '公開', internal: '社内向け', features: '主な機能', current: '現在のプラットフォーム',
    website: ['ICUEの紹介、研究、活動をご覧ください', 'ICUEサイトを開く', ['組織・チーム紹介', '研究・プロジェクト', 'ニュース・活動', 'ICUEを探索']],
    hr: ['人事情報と勤務時間を管理', '人事ポータルを開く', ['職員プロフィール', '勤怠・勤務時間', '休暇申請・承認', '月次レポート']],
    contracts: ['契約と関連書類を一元管理', '契約管理を開く', ['契約一覧', '詳細・関連書類', 'ステータス確認', '検索・管理']],
  },
  ko: {
    heading: 'ICUE 생태계 둘러보기',
    subtitle: 'ICUE 생태계의 플랫폼과 도구',
    public: '공개', internal: '내부', features: '주요 기능', current: '현재 이용 중',
    website: ['ICUE 소개, 연구 및 활동을 살펴보세요', 'ICUE 웹사이트 열기', ['소개 및 팀', '연구 및 프로젝트', '소식 및 활동', 'ICUE 둘러보기']],
    hr: ['인사 정보와 근무 시간을 관리하세요', '인사 포털 열기', ['직원 프로필', '출퇴근 및 근무 시간', '휴가 및 승인', '월간 보고서']],
    contracts: ['계약과 관련 문서를 한곳에서 관리하세요', '계약 관리 열기', ['계약 목록', '정보 및 문서', '상태 추적', '검색 및 관리']],
  },
  th: {
    heading: 'สำรวจระบบนิเวศ ICUE',
    subtitle: 'แพลตฟอร์มและเครื่องมือในระบบนิเวศ ICUE',
    public: 'สาธารณะ', internal: 'ภายใน', features: 'ฟังก์ชันหลัก', current: 'คุณอยู่ที่นี่',
    website: ['รู้จัก ICUE งานวิจัย และกิจกรรม', 'เปิดเว็บไซต์ ICUE', ['ข้อมูลและทีมงาน', 'งานวิจัยและโครงการ', 'ข่าวสารและกิจกรรม', 'สำรวจ ICUE']],
    hr: ['จัดการบุคลากรและเวลาทำงาน', 'เปิดพอร์ทัลบุคลากร', ['ประวัติบุคลากร', 'การเข้างานและชั่วโมงทำงาน', 'การลาและการอนุมัติ', 'รายงานประจำเดือน']],
    contracts: ['จัดการสัญญาและเอกสารในที่เดียว', 'เปิดการจัดการสัญญา', ['รายการสัญญา', 'ข้อมูลและเอกสาร', 'ติดตามสถานะ', 'ค้นหาและจัดการ']],
  },
  ru: {
    heading: 'Откройте экосистему ICUE',
    subtitle: 'Платформы и инструменты экосистемы ICUE',
    public: 'ПУБЛИЧНЫЙ', internal: 'ВНУТРЕННИЙ', features: 'ОСНОВНЫЕ ФУНКЦИИ', current: 'Вы здесь',
    website: ['Знакомство с ICUE, исследованиями и событиями', 'Открыть сайт ICUE', ['О нас и команда', 'Исследования и проекты', 'Новости и события', 'Откройте ICUE']],
    hr: ['Управление персоналом и рабочим временем', 'Открыть кадровый портал', ['Профили сотрудников', 'Посещаемость и часы', 'Отпуска и согласования', 'Ежемесячные отчёты']],
    contracts: ['Договоры и документы в одном месте', 'Открыть управление договорами', ['Список договоров', 'Сведения и документы', 'Отслеживание статуса', 'Поиск и управление']],
  },
  zh: {
    heading: '探索 ICUE 生态系统',
    subtitle: 'ICUE 生态系统中的平台与工具',
    public: '公开', internal: '内部', features: '主要功能', current: '您在这里',
    website: ['了解 ICUE、研究与活动', '打开 ICUE 网站', ['简介与团队', '研究与项目', '新闻与活动', '探索 ICUE']],
    hr: ['管理人事与工作时间', '打开人事门户', ['员工档案', '考勤与工时', '休假与审批', '月度报告']],
    contracts: ['集中管理合同与档案', '打开合同管理', ['合同列表', '信息与档案', '状态跟踪', '查询与管理']],
  },
};

export function getEcosystemNavigation(locale = 'en') {
  const code = String(locale).toLowerCase().split(/[-_]/)[0];
  const language = ({ vn: 'vi', jp: 'ja', kr: 'ko' })[code] || code;
  const copy = COPY[language] || COPY.en;
  const navigation = getAppNavigation(locale);
  return {
    ...navigation,
    heading: copy.heading,
    subtitle: copy.subtitle,
    current: copy.current,
    features: copy.features,
    apps: navigation.apps.map(app => ({
      ...app,
      category: app.id === 'website' ? copy.public : copy.internal,
      description: copy[app.id][0],
      action: copy[app.id][1],
      features: copy[app.id][2],
    })),
  };
}
