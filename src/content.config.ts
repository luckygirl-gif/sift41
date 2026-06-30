import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    brand: z.string().optional().default(''),
    category: z.string().default('uncategorized'),
    image: z.string(),
    price: z.string().optional().default(''),
    buyUrl: z.string().optional().default(''),
    date: z.coerce.date(),
    summary: z.string().optional().default(''),
    descEn: z.string().optional().default(''),
    descKo: z.string().optional().default(''),
  }),
});

export const collections = { products };
