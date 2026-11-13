export interface BoardTheme {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  darkSquare: string;
  lightSquare: string;
  borderColor: string;
  ringColor: string;
  notationDark: string;
  notationLight: string;
  previewColors: [string, string];
  tag: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic-wood',
    name: 'Classic Walnut & Maple',
    subtitle: 'Default Masterpiece',
    description: 'Authentic tournament hand-carved wood grain feel with rich walnut darks and warm maple lights.',
    darkSquare: '#b58863',
    lightSquare: '#f0d9b5',
    borderColor: '#3a2312',
    ringColor: 'rgba(212, 163, 115, 0.45)',
    notationDark: '#f0d9b5',
    notationLight: '#b58863',
    previewColors: ['#f0d9b5', '#b58863'],
    tag: 'Default',
  },
  {
    id: 'imperial-sapphire',
    name: 'Imperial Sapphire & Pearl',
    subtitle: 'Royal Court',
    description: 'Deep royal velvet navy with luminescent pearl squares and burnished royal gold accents.',
    darkSquare: '#1b2d4b',
    lightSquare: '#e8eef7',
    borderColor: '#0b1320',
    ringColor: 'rgba(229, 184, 105, 0.55)',
    notationDark: '#e8eef7',
    notationLight: '#1b2d4b',
    previewColors: ['#e8eef7', '#1b2d4b'],
    tag: 'Royal',
  },
  {
    id: 'obsidian-carrara',
    name: 'Obsidian Onyx & Marble',
    subtitle: 'Monochrome Luxury',
    description: 'Sleek dark obsidian carbon paired with polished Carrara marble for modern high-contrast clarity.',
    darkSquare: '#2a2e39',
    lightSquare: '#eaebed',
    borderColor: '#13161c',
    ringColor: 'rgba(255, 255, 255, 0.25)',
    notationDark: '#eaebed',
    notationLight: '#2a2e39',
    previewColors: ['#eaebed', '#2a2e39'],
    tag: 'Modern',
  },
  {
    id: 'emerald-sovereign',
    name: 'Emerald Sovereign & Ivory',
    subtitle: 'World Championship',
    description: 'Prestigious deep emerald felt and warm ivory squares inspired by historic world championships.',
    darkSquare: '#38694d',
    lightSquare: '#edeed1',
    borderColor: '#12251a',
    ringColor: 'rgba(52, 211, 153, 0.35)',
    notationDark: '#edeed1',
    notationLight: '#38694d',
    previewColors: ['#edeed1', '#38694d'],
    tag: 'Championship',
  },
  {
    id: 'amethyst-crown',
    name: 'Amethyst Velvet & Lilac',
    subtitle: 'Crown Jewel',
    description: 'Royal amethyst velvet with crystalline lilac quartz, crafted for monarchs and grandmasters.',
    darkSquare: '#4a2559',
    lightSquare: '#f3e8f8',
    borderColor: '#1e0c24',
    ringColor: 'rgba(216, 180, 254, 0.45)',
    notationDark: '#f3e8f8',
    notationLight: '#4a2559',
    previewColors: ['#f3e8f8', '#4a2559'],
    tag: 'Crown',
  },
];

const THEME_STORAGE_KEY = 'mikasa_chess_active_board_theme';

export function getActiveBoardTheme(): BoardTheme {
  if (typeof window === 'undefined') return BOARD_THEMES[0];
  try {
    const savedId = localStorage.getItem(THEME_STORAGE_KEY);
    const found = BOARD_THEMES.find((t) => t.id === savedId);
    return found || BOARD_THEMES[0]; // Defaults to Classic Wood!
  } catch {
    return BOARD_THEMES[0];
  }
}

export function setActiveBoardTheme(themeId: string): BoardTheme {
  const target = BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES[0];
  try {
    localStorage.setItem(THEME_STORAGE_KEY, target.id);
    window.dispatchEvent(new CustomEvent('board_theme_changed', { detail: target }));
  } catch {
    // ignore
  }
  return target;
}
