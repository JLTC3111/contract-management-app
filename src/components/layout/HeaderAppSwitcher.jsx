import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import AppSwitcher from '../app-switcher/AppSwitcher.jsx';

/** The ecosystem menu, icon-only, for page headers. */
const HeaderAppSwitcher = () => {
  const { i18n } = useTranslation();
  const { darkMode } = useTheme();

  return (
    <div className="ledger-apps">
      <AppSwitcher
        currentApp="contracts"
        locale={i18n.resolvedLanguage || i18n.language}
        appearance={darkMode ? 'dark' : 'light'}
        compact
      />
    </div>
  );
};

export default HeaderAppSwitcher;
