export const COLOR_THEMES = [
    {
        id: 'indigo',
        name: 'Indigo',
        colors: {
            primary: '243 75% 59%', // #6366f1
            primaryForeground: '0 0% 100%',
            ring: '243 75% 59%',
        },
    },
    {
        id: 'purple',
        name: 'Purple',
        colors: {
            primary: '270 95% 60%', // #9333ea
            primaryForeground: '0 0% 100%',
            ring: '270 95% 60%',
        },
    },
    {
        id: 'rose',
        name: 'Rose',
        colors: {
            primary: '343 88% 56%', // #e11d48
            primaryForeground: '0 0% 100%',
            ring: '343 88% 56%',
        },
    },
    {
        id: 'emerald',
        name: 'Emerald',
        colors: {
            primary: '150 96% 33%', // #059669
            primaryForeground: '0 0% 100%',
            ring: '150 96% 33%',
        },
    },
    {
        id: 'amber',
        name: 'Amber',
        colors: {
            primary: '38 92% 50%', // #d97706
            primaryForeground: '0 0% 100%',
            ring: '38 92% 50%',
        },
    },
] as const;

export type ColorThemeId = typeof COLOR_THEMES[number]['id'];
