import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { SPRING_FESTIVAL_THEME } from '@/constants/constants';

import 'vuetify/styles';

// 春节主题：中国红 + 金色
const springFestivalTheme = {
  dark: false,
  colors: {
    primary: '#c41e3a',
    secondary: '#d4af37',
    accent: '#d4af37',
    error: '#b71c1c',
    background: '#fffbf5',
    surface: '#fffbf5',
  },
};

const defaultTheme = {
  dark: false,
  colors: {},
};

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: SPRING_FESTIVAL_THEME ? 'springFestival' : 'light',
    themes: {
      light: defaultTheme,
      springFestival: springFestivalTheme,
    },
  },
});