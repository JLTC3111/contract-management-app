import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import '@fontsource-variable/archivo';
import './ErrorBoundary.css';

function CrashScreen({ error, errorInfo, fallback }) {
  const { t } = useTranslation();
  const dump = [error && error.toString(), errorInfo && errorInfo.componentStack]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="crash" role="alert">
      <nav className="crash-nav">
        <img src="/logoIcons/logo.png" alt="" className="crash-nav__logo" />
        <p className="crash-nav__brand">{t('login.title', 'Contract Manager')}</p>
      </nav>

      <div className="crash-main">
        <p className="crash-kicker">{t('errorBoundary.kicker', 'Application error')}</p>
        <h1 className="crash-headline">
          {t('errorBoundary.headline', 'Something went wrong.')}
        </h1>
        <p className="crash-lede">
          {t('errorBoundary.lede', 'This page could not be shown. Reload to try again.')}
        </p>

        {dump ? (
          <details className="crash-dump">
            <summary>{t('errorBoundary.details', 'Technical details')}</summary>
            <pre className="crash-dump__body">{dump}</pre>
          </details>
        ) : null}

        <button
          type="button"
          className="crash-reload"
          onClick={() => window.location.reload()}
        >
          <span>{t('errorBoundary.reload', 'Reload')}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        {fallback ? <div className="crash-fallback">{fallback}</div> : null}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <CrashScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          fallback={this.props.fallback}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
