import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,html}',
    ],
    theme: {
        extend: {
            colors: {
                border: 'var(--color-border)',
                input: 'var(--color-border)',
                ring: 'var(--color-accent)',
                background: 'var(--color-bg)',
                foreground: 'var(--color-text)',
                primary: {
                    DEFAULT: 'var(--color-accent)',
                    foreground: 'var(--color-text-inverse)',
                },
                secondary: {
                    DEFAULT: 'var(--color-bg-secondary)',
                    foreground: 'var(--color-text)',
                },
                destructive: {
                    DEFAULT: 'var(--color-error)',
                    foreground: 'var(--color-text-inverse)',
                },
                muted: {
                    DEFAULT: 'var(--color-bg-tertiary)',
                    foreground: 'var(--color-text-tertiary)',
                },
                accent: {
                    DEFAULT: 'var(--color-accent-subtle)',
                    foreground: 'var(--color-accent)',
                },
            },
            borderRadius: {
                lg: 'var(--radius-xl)',
                md: 'var(--radius-lg)',
                sm: 'var(--radius-md)',
            },
            animation: {
                'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
                'pulse': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
};

export default config;
