export const COLOR_THEMES = [
    {
        id: 'indigo',
        name: 'Indigo',
        colors: {
            primary: '243 75% 59%',
            primaryForeground: '0 0% 100%',
            ring: '243 75% 59%',
        },
    },
    {
        id: 'purple',
        name: 'Purple',
        colors: {
            primary: '270 95% 60%',
            primaryForeground: '0 0% 100%',
            ring: '270 95% 60%',
        },
    },
    {
        id: 'rose',
        name: 'Rose',
        colors: {
            primary: '343 88% 46%', // Darkened for WCAG AA on white and button fg
            primaryForeground: '0 0% 100%',
            ring: '343 88% 42%',
        },
    },
    {
        id: 'emerald',
        name: 'Emerald',
        colors: {
            primary: '150 96% 24%', // Darkened for WCAG AA on white with white fg
            primaryForeground: '0 0% 100%',
            ring: '150 96% 24%',
        },
    },
    {
        id: 'amber',
        name: 'Amber',
        colors: {
            primary: '38 92% 30%', // Darkened for WCAG AA on white with white fg
            primaryForeground: '0 0% 100%',
            ring: '38 92% 30%',
        },
    },
] as const;

export type ColorThemeId = typeof COLOR_THEMES[number]['id'];
