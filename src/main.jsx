// Keep bootstrap independent of app/SDK imports so a failed module still offers
// recovery, including browsers that throw before React can mount its boundary.
import messages from './i18n/recovery.json';
const copy = messages[navigator.language.split('-')[0]] || messages.en;
const root = document.getElementById('root');
const showStartupError = (error) => {
  const panel = document.createElement('main');
  panel.id = 'boot-error';
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'box-sizing:border-box;max-width:560px;margin:12vh auto;padding:24px;font:16px/1.5 system-ui,sans-serif';
  const heading = document.createElement('h1');
  heading.textContent = copy.startupHeadline;
  const message = document.createElement('p');
  message.textContent = error?.name === 'SecurityError'
    ? copy.startupStorage
    : copy.startupConnection;
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload';
  reload.style.cssText = 'min-height:44px;padding:10px 24px;font:inherit;cursor:pointer';
  reload.addEventListener('click', () => window.location.reload());
  panel.append(heading, message, reload);
  root.replaceChildren(panel);
};
const deadline = setTimeout(() => showStartupError(), 15000);
import('./appRoot.jsx').then(() => clearTimeout(deadline), (error) => {
  clearTimeout(deadline);
  showStartupError(error);
});
