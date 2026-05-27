import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
    	extend: {
    		colors: {
    			background: 'oklch(var(--background) / <alpha-value>)',
    			foreground: 'oklch(var(--foreground) / <alpha-value>)',
    			card: {
    				DEFAULT: 'oklch(var(--card) / <alpha-value>)',
    				foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
    			},
    			popover: {
    				DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
    				foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
    			},
    			primary: {
    				DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
    				foreground: 'oklch(var(--primary-foreground) / <alpha-value>)'
    			},
    			secondary: {
    				DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
    				foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
    			},
    			muted: {
    				DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
    				foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
    			},
    			accent: {
    				DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
    				foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
    			},
    			destructive: {
    				DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
    				foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
    			},
    			border: 'oklch(var(--border))',
    			input: 'oklch(var(--input))',
    			ring: 'oklch(var(--ring) / <alpha-value>)',
    			chart: {
    				'1': 'oklch(var(--chart-1))',
    				'2': 'oklch(var(--chart-2))',
    				'3': 'oklch(var(--chart-3))',
    				'4': 'oklch(var(--chart-4))',
    				'5': 'oklch(var(--chart-5))'
    			},
    			sidebar: {
    				DEFAULT: 'oklch(var(--sidebar-background) / <alpha-value>)',
    				foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
    				primary: 'oklch(var(--sidebar-primary) / <alpha-value>)',
    				'primary-foreground': 'oklch(var(--sidebar-primary-foreground) / <alpha-value>)',
    				accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
    				'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
    				border: 'oklch(var(--sidebar-border))',
    				ring: 'oklch(var(--sidebar-ring) / <alpha-value>)'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		}
    	}
    },
    plugins: [tailwindAnimate],
};
export default config;
