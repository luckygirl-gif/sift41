import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 프로덕션: 커스텀 도메인(base '/'). 프리뷰(github.io/<repo>): env로 base 지정.
const SITE = process.env.SITE_URL || 'https://www.sift41.com';
const BASE = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [sitemap()],
});
