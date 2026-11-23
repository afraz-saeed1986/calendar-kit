import { createApp, defineComponent, h } from 'vue';
import '@calendrix/vue/styles.css';
import './demo.css';
import App from './App.vue';
import { examples } from './examples';

// The documentation site shows one example in an iframe, chosen by the hash: #date-picker
const Example = examples[window.location.hash.slice(1)];
window.addEventListener('hashchange', () => window.location.reload());

const Root = Example
  ? defineComponent({ render: () => h('div', { style: 'padding: 16px' }, [h(Example)]) })
  : App;

createApp(Root).mount('#app');