import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const component = (name) => Object.assign(() => null, { displayName: name });

// Source-level handler tests. This deliberately does not claim browser coverage.
export function harness({ seed = [], user = { id: 'editor', role: 'editor' }, api = {}, supabase } = {}) {
  const state = [...seed];
  const refs = [];
  let cursor = 0;
  let refCursor = 0;
  const react = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
      return [state[slot], (next) => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }];
    },
    useRef(value) { return refs[refCursor++] ||= { current: value }; },
    useEffect() {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const code = transformSync(readFileSync(absolute, 'utf8'), {
      loader: absolute.endsWith('.jsx') ? 'jsx' : 'js', format: 'cjs',
      jsxFactory: 'testJsx', jsxFragment: 'testFragment',
    }).code;
    const require = (specifier) => {
      if (specifier === 'react') return react;
      if (/\/supaBaseClient$/.test(specifier)) return { supabase };
      if (/\/data\/mockData$/.test(specifier)) return {};
      if (/\/useUser$/.test(specifier)) return { useUser: () => ({ user }) };
      if (/\/api\/contracts$/.test(specifier)) return api;
      if (specifier.endsWith('.css')) return {};
      if (specifier === 'lucide-react') return new Proxy({}, { get: (_, name) => component(name) });
      if (specifier === 'react-hot-toast') return { success() {}, error() {} };
      if (specifier === 'react-i18next') return { useTranslation: () => ({
        t: (key, fallback) => typeof fallback === 'string' ? fallback : key, i18n: { language: 'en' },
      }) };
      if (specifier === 'react-router-dom') return { useNavigate: () => () => {}, useParams: () => ({}) };
      if (specifier.startsWith('.')) {
        const base = path.resolve(path.dirname(absolute), specifier);
        if (base.includes('/utils/') || base.includes('/hooks/') || base.includes('/api/')) {
          return load([base, `${base}.js`, `${base}.jsx`].find((name) => existsSync(name)));
        }
        return { __esModule: true, default: component(path.basename(base)), StageTag: component('StageTag'), DEFAULT_PHASES: [] };
      }
      throw new Error(`Unexpected dependency: ${specifier}`);
    };
    vm.runInNewContext(code, {
      require, module, exports: module.exports,
      testJsx: (type, props, ...children) => ({ type, props: { ...props, children } }), testFragment: 'fragment',
      console: { log() {}, error() {} }, Date, Intl, Map, Set, crypto: globalThis.crypto,
      localStorage: { getItem: () => null },
    }, { filename: absolute });
    return module.exports;
  }
  return { load, state, render: (fn, props) => { cursor = refCursor = 0; return fn(props); } };
}

export const nodes = (tree) => Array.isArray(tree) ? tree.flatMap(nodes) :
  tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
export const textOf = (tree) => Array.isArray(tree) ? tree.map(textOf).join(' ') :
  tree && typeof tree === 'object' ? textOf(tree.props?.children) : typeof tree === 'string' ? tree : '';
export const button = (tree, text) => nodes(tree).find((node) => node.type === 'button' && textOf(node).includes(text));
export const named = (tree, name) => nodes(tree).find((node) => node.type?.displayName === name);
