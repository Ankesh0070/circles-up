import { Sofa, Smartphone, BookOpen, Shirt, Gift } from 'lucide-react-native';

export const bazaarCategories = [
  { name: 'Furniture', value: 'furniture', icon: Sofa, color: '#B45309' },
  { name: 'Electronics', value: 'electronics', icon: Smartphone, color: '#2563EB' },
  { name: 'Books', value: 'books', icon: BookOpen, color: '#7C3AED' },
  { name: 'Clothing', value: 'clothing', icon: Shirt, color: '#DB2777' },
  { name: 'Free', value: 'free', icon: Gift, color: '#059669' },
] as const;

export type BazaarCategory = (typeof bazaarCategories)[number]['value'];

export function bazaarCategoryMeta(value: string) {
  return bazaarCategories.find((c) => c.value === value) ?? bazaarCategories[0];
}
