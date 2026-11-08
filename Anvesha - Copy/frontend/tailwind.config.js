/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 50: '#F6F7FB', 100: '#EEF0F7', 200: '#DFE2EE', 300: '#C4C9DD', 400: '#9BA2C0', 500: '#747CA0', 600: '#545E84', 700: '#39436B', 800: '#232E57', 900: '#141E42', 950: '#0B1433' },
        brand: { 50: '#FFF5EC', 100: '#FFE7D1', 200: '#FFCBA0', 300: '#FFA866', 400: '#FB8A3C', 500: '#F2711C', 600: '#D95B0A', 700: '#B4470B', 800: '#8F3A10' },
        rani: { 50: '#FDEFF5', 100: '#FBD9E7', 400: '#EE5C98', 500: '#E0397B', 600: '#C22463' },
        leaf: { 50: '#EAF8F4', 100: '#CDEFE5', 400: '#34B894', 500: '#12A383', 600: '#0B8A6E', 700: '#0A6E59' },
        sky2: { 50: '#EEF4FF', 100: '#DCE7FF', 500: '#4E6BD6', 600: '#3B55B8' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,20,51,.05), 0 10px 28px -12px rgba(11,20,51,.16)',
        lift: '0 2px 4px rgba(11,20,51,.06), 0 22px 44px -18px rgba(11,20,51,.28)',
        float: '0 12px 32px -8px rgba(242,113,28,.55)',
        ring: '0 0 0 4px rgba(242,113,28,.18)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
        'pulse-ring': { '0%': { transform: 'scale(.6)', opacity: '.7' }, '100%': { transform: 'scale(2.4)', opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        dash: { to: { strokeDashoffset: '-24' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'none' } },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.2,.7,.2,1) both',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(.2,.7,.2,1) infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        dash: 'dash 1s linear infinite',
        'slide-in': 'slide-in .32s cubic-bezier(.2,.8,.2,1) both',
        'slide-up': 'slide-up .32s cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop .5s cubic-bezier(.2,.8,.2,1) both',
        bob: 'bob 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
